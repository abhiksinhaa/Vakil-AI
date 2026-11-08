CREATE TABLE organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid references auth.users(id) not null,
  seats_total integer default 3,
  drafts_limit integer default 500,
  plan_expires_at timestamptz,
  created_at timestamptz default now()
);

CREATE TABLE organization_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) not null,
  user_id uuid references auth.users(id),
  invited_email text not null,
  role text default 'member',
  status text default 'invited',
  created_at timestamptz default now()
);

ALTER TABLE profiles ADD COLUMN org_id uuid references organizations(id);

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Org members can view their org" ON organizations FOR SELECT USING (id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Org owners can update their org" ON organizations FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Org owners can insert orgs" ON organizations FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can view members of their org" ON organization_members FOR SELECT USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Org owners can manage members" ON organization_members FOR ALL USING (org_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()));
