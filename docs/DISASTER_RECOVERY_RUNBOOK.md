# Kabgeer Masale — Database Backup & Disaster Recovery Runbook

**Document Version**: 1.0  
**Target Environment**: Production (`cfvopnzcqbtqcupdomto`, AWS ap-south-1 Mumbai)  
**Database**: PostgreSQL 15 (Supabase Hosted)  
**Last Verified**: 2026-10-29  

---

## 1. Overview and Recovery Objectives

- **Recovery Point Objective (RPO)**: Maximum acceptable data loss window = **24 hours** (Daily automated snapshots) or **immediate** with Point-in-Time Recovery (PITR).
- **Recovery Time Objective (RTO)**: Target time to restore complete database availability = **< 15 minutes**.
- **Critical Data Assets Protected**:
  1. `public.orders` (Customer purchase transactions and status)
  2. `public.payments` (Razorpay payment confirmation records)
  3. `public.shipments` (Courier AWB, tracking status)
  4. `public.inventory` (Product stock quantities)
  5. `public.profiles` (Customer and Admin authorization records)

---

## 2. Backup Methods

### A. Automated Daily Snapshots (Supabase Managed)
- Supabase automatically takes full database snapshots daily between 00:00 and 06:00 UTC.
- Daily backups are retained based on project tier (Free: 7 days, Pro: 30 days).
- In the Supabase Dashboard, navigate to **Project Settings** → **Database** → **Backups** to inspect available daily snapshots.

### B. On-Demand Full Backup via Supabase CLI
Before applying major migrations or changes, generate an instant local SQL snapshot:

```bash
# 1. Export entire database schema + RLS policies
npx supabase db dump --linked -f supabase_backup_schema_$(date +%Y%m%d).sql

# 2. Export all production table data (orders, inventory, profiles)
npx supabase db dump --linked --data-only -f supabase_backup_data_$(date +%Y%m%d).sql
```

### C. Direct `pg_dump` Export (Standard PostgreSQL)
You can also take a direct database dump using the direct PostgreSQL connection string (available in **Project Settings** → **Database** → **Connection string**):

```bash
pg_dump "postgresql://postgres:[YOUR-PASSWORD]@db.cfvopnzcqbtqcupdomto.supabase.co:5432/postgres" \
  --format=custom \
  --file=kabgeer_prod_backup_$(date +%Y%m%d).dump
```

---

## 3. Disaster Recovery Restoration Procedure

### Scenario A: Accidental Record Deletion or Corruption (Selective Restore)
If specific rows in `orders` or `inventory` are corrupted:
1. Locate the most recent backup `.sql` file.
2. Extract the specific table data or rows:
   ```bash
   grep -E "INSERT INTO \"public\"\.\"orders\"" supabase_backup_data.sql > restore_orders.sql
   ```
3. Re-insert the missing records using the Supabase SQL Editor or `psql`.

### Scenario B: Full Database Catastrophic Recovery
If the database requires a complete restoration:
1. In the Supabase Dashboard, navigate to **Database** → **Backups**.
2. Select the desired restore snapshot timestamp.
3. Click **Restore**.
4. The database will enter maintenance mode and restore the complete state.
5. **Post-Restore Verification Checklist**:
   - [ ] Confirm table count: 8 core tables (`orders`, `payments`, `shipments`, `inventory`, `products`, `profiles`, `reviews`, `coupons`).
   - [ ] Confirm genuine customer order count (4 verified production orders).
   - [ ] Run security regression suite to verify RLS and locked RPCs:
     ```bash
     node security-tests/test-urgent-security-regression.mjs
     ```
   - [ ] Confirm all 12 regression probes return **PASS**.

---

## 4. Emergency Contacts & Escalation Matrix

- **Store Administrator**: ayush2k6 / Babumohammadshakib
- **Platform Infrastructure**: Supabase Cloud Status (`https://status.supabase.com`)
- **Payment Gateway**: Razorpay Merchant Support & Webhook Logs
- **Email Infrastructure**: Resend Dashboard Logs
