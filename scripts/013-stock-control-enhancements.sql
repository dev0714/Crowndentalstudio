-- Stock control enhancements for expiry tracking, batch traceability, and room/cupboard storage.
alter table if exists public.stock_items
  add column if not exists batch_number text,
  add column if not exists storage_location text,
  add column if not exists min_stock_level integer;

update public.stock_items
set min_stock_level = coalesce(min_stock_level, reorder_level)
where min_stock_level is null;

create index if not exists stock_items_storage_location_idx on public.stock_items (storage_location);
create index if not exists stock_items_expiry_date_idx on public.stock_items (expiry_date);

comment on column public.stock_items.batch_number is 'Batch or lot number used for expiry and traceability.';
comment on column public.stock_items.storage_location is 'Room, cupboard, shelf, or other storage location.';
comment on column public.stock_items.min_stock_level is 'Minimum stock threshold used for reorder alerts.';
