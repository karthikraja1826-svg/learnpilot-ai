import { Outlet } from 'react-router-dom';

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <Outlet />
    </div>
  );
}
