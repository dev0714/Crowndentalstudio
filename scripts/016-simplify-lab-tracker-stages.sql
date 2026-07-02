-- Simplify the lab tracker to four stages:
-- New patient -> Collected from Crown Dental Studio -> At Lab -> Delivered to Crown Dental Studio

alter table if exists public.lab_cases
  alter column workflow_stage set default 'New patient';

update public.lab_cases
set workflow_stage = case workflow_stage
  when 'Created' then 'New patient'
  when 'Collected' then 'Collected from Crown Dental Studio'
  when 'Received by lab' then 'At Lab'
  when 'In production' then 'At Lab'
  when 'Ready' then 'At Lab'
  when 'Dispatched' then 'At Lab'
  when 'Returned for adjustment' then 'At Lab'
  when 'Remake' then 'At Lab'
  when 'Received by practice' then 'Delivered to Crown Dental Studio'
  when 'Fitted to patient' then 'Delivered to Crown Dental Studio'
  when 'Completed' then 'Delivered to Crown Dental Studio'
  else coalesce(workflow_stage, 'New patient')
end
where workflow_stage is null
   or workflow_stage in (
     'Created', 'Collected', 'Received by lab', 'In production', 'Ready', 'Dispatched',
     'Received by practice', 'Fitted to patient', 'Returned for adjustment', 'Remake', 'Completed'
   );
