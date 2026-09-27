'use client';

import Users from '../../../../components/people/Users';

export default function UsersPage() {
  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">Manage user accounts and roles.</p>
      </div>
      <Users />
    </div>
  );
}
