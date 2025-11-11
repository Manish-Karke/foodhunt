import Sidebar from "@/components/sidebar";
import React from "react";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div>
      <div className="flex gap-2">
        <Sidebar />
        {children}
      </div>
    </div>
  );
};

export default Layout;
