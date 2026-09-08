import React from "react";
import Header from "./components/Header";
import AuthGate from "./components/AuthGate";
import ChatTerminal from "./components/ChatTerminal";

export default function App() {
  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col dash-aurora font-body">
      <Header />
      <main className="flex-1 flex flex-col">
        <AuthGate>
          {({ xUsername, wallet }) => (
            <ChatTerminal xUsername={xUsername} wallet={wallet} />
          )}
        </AuthGate>
      </main>
    </div>
  );
}
