
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors, errorResponse, successResponse } from "../_shared/cors.ts";

interface ScheduleRequest {
  datasetId: string;
  schedule: {
    type: 'once' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom';
    value?: string; // For custom CRON expressions
    date?: string;  // For one-time schedules
    time?: string;  // For one-time schedules
    dayOfWeek?: number; // 0-6, for weekly schedules
    dayOfMonth?: number; // 1-31, for monthly schedules
    hour?: number;  // 0-23, for daily/weekly/monthly schedules
    minute?: number; // 0-59, for hourly/daily/weekly/monthly schedules
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse request
    const { datasetId, schedule } = await req.json();

    if (!datasetId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing datasetId parameter" }),
        { headers: corsHeaders, status: 400 }
      );
    }

    if (!schedule || !schedule.type) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing or invalid schedule parameter" }),
        { headers: corsHeaders, status: 400 }
      );
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    // Get the user ID
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Authentication required" 
        }),
        { headers: corsHeaders, status: 401 }
      );
    }

    // Verify the dataset exists and belongs to the user
    const { data: dataset, error: datasetError } = await supabaseClient
      .from("user_datasets")
      .select("*")
      .eq("id", datasetId)
      .eq("user_id", user.id)
      .single();

    if (datasetError) {
      return new Response(
        JSON.stringify({ success: false, error: `Dataset not found or access denied: ${datasetError.message}` }),
        { headers: corsHeaders, status: 404 }
      );
    }

    // Generate CRON expression based on schedule type
    const cronExpression = generateCronExpression(schedule);
    
    // For one-time schedules, calculate next run time
    let nextRunTime = null;
    if (schedule.type === 'once') {
      if (!schedule.date || !schedule.time) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing date or time for one-time schedule" }),
          { headers: corsHeaders, status: 400 }
        );
      }
      
      // Parse the date and time
      const dateTime = new Date(`${schedule.date}T${schedule.time}`);
      if (isNaN(dateTime.getTime())) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid date or time format" }),
          { headers: corsHeaders, status: 400 }
        );
      }
      
      nextRunTime = dateTime.toISOString();
    } else {
      // For recurring schedules, set a default next run time - 1 hour from now
      nextRunTime = new Date(Date.now() + 3600000).toISOString();
    }

    // Create or update the schedule in the database
    const scheduleData = {
      dataset_id: datasetId,
      user_id: user.id,
      schedule_type: schedule.type,
      cron_expression: cronExpression,
      next_run_time: nextRunTime,
      is_active: true,
      parameters: {
        ...schedule,
        created_at: new Date().toISOString()
      }
    };

    // Check if a schedule already exists for this dataset
    const { data: existingSchedule, error: existingError } = await supabaseClient
      .from("dataset_schedules")
      .select("id")
      .eq("dataset_id", datasetId)
      .maybeSingle();

    let scheduleId;
    if (existingSchedule?.id) {
      // Update existing schedule
      const { data: updated, error: updateError } = await supabaseClient
        .from("dataset_schedules")
        .update(scheduleData)
        .eq("id", existingSchedule.id)
        .select()
        .single();
        
      if (updateError) {
        return new Response(
          JSON.stringify({ success: false, error: `Failed to update schedule: ${updateError.message}` }),
          { headers: corsHeaders, status: 500 }
        );
      }
      
      scheduleId = updated.id;
    } else {
      // Create new schedule
      const { data: created, error: createError } = await supabaseClient
        .from("dataset_schedules")
        .insert(scheduleData)
        .select()
        .single();
        
      if (createError) {
        return new Response(
          JSON.stringify({ success: false, error: `Failed to create schedule: ${createError.message}` }),
          { headers: corsHeaders, status: 500 }
        );
      }
      
      scheduleId = created.id;
    }

    // For one-time schedules, we also need to create an entry in the job queue
    if (schedule.type === 'once') {
      const { error: queueError } = await supabaseClient
        .from("dataset_job_queue")
        .insert({
          dataset_id: datasetId,
          user_id: user.id,
          schedule_id: scheduleId,
          status: "pending",
          scheduled_time: nextRunTime,
          priority: 1,
          retry_count: 0,
          max_retries: 3
        });
        
      if (queueError) {
        console.error("Error creating job queue entry:", queueError);
        // We'll continue anyway since the schedule was created successfully
      }
    }

    // Return success
    return new Response(
      JSON.stringify({
        success: true,
        scheduleId,
        schedule: {
          type: schedule.type,
          cronExpression,
          nextRunTime
        }
      }),
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error in Dataset_Schedule:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: corsHeaders, status: 500 }
    );
  }
});

/**
 * Generates a CRON expression based on the schedule configuration
 */
function generateCronExpression(schedule: ScheduleRequest['schedule']): string {
  const { type } = schedule;
  
  switch (type) {
    case 'once':
      // One-time schedules don't use CRON, but we'll generate one anyway for consistency
      // Format: minute hour day-of-month month day-of-week
      if (schedule.date && schedule.time) {
        const dateTime = new Date(`${schedule.date}T${schedule.time}`);
        return `${dateTime.getMinutes()} ${dateTime.getHours()} ${dateTime.getDate()} ${dateTime.getMonth() + 1} *`;
      }
      return '0 0 * * *'; // Default to midnight every day if date/time not provided
    
    case 'hourly':
      // Run at the specified minute every hour
      const minute = schedule.minute !== undefined ? schedule.minute : 0;
      return `${minute} * * * *`;
    
    case 'daily':
      // Run at the specified hour:minute every day
      const dailyHour = schedule.hour !== undefined ? schedule.hour : 0;
      const dailyMinute = schedule.minute !== undefined ? schedule.minute : 0;
      return `${dailyMinute} ${dailyHour} * * *`;
    
    case 'weekly':
      // Run at the specified hour:minute on the specified day of the week
      const weeklyHour = schedule.hour !== undefined ? schedule.hour : 0;
      const weeklyMinute = schedule.minute !== undefined ? schedule.minute : 0;
      const weeklyDay = schedule.dayOfWeek !== undefined ? schedule.dayOfWeek : 0;
      return `${weeklyMinute} ${weeklyHour} * * ${weeklyDay}`;
    
    case 'monthly':
      // Run at the specified hour:minute on the specified day of the month
      const monthlyHour = schedule.hour !== undefined ? schedule.hour : 0;
      const monthlyMinute = schedule.minute !== undefined ? schedule.minute : 0;
      const monthlyDay = schedule.dayOfMonth !== undefined ? schedule.dayOfMonth : 1;
      return `${monthlyMinute} ${monthlyHour} ${monthlyDay} * *`;
    
    case 'custom':
      // Use the provided CRON expression directly
      if (!schedule.value) {
        throw new Error("Custom schedule requires a CRON expression in the 'value' field");
      }
      return schedule.value;
    
    default:
      throw new Error(`Unsupported schedule type: ${type}`);
  }
}
