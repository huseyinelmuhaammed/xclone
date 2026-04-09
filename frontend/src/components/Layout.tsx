import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import TrendingPanel from "./TrendingPanel";

interface Props {
  children: ReactNode;
}

export default function Layout({ children }: Props) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="feed">{children}</main>
      <TrendingPanel />
    </div>
  );
}
