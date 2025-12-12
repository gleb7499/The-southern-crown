import React from 'react';
import Sidebar from './Sidebar';

export default function Layout({ children }) {
  return (
    <div className="dashboard">
      <Sidebar />
      <div className="main-content">
        {children}
      </div>
    </div>
  );
}
