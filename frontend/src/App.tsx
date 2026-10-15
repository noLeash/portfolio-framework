import { useState } from "react";
import { useAuth } from "./components/hooks/useAuth";
import "./App.css";
import Login from "./components/Login/Login";
import { Button } from "rsuite";

function App() {
  const { isAuthenticated, user, logout } = useAuth();

  if (!isAuthenticated) {
    return (
      <>
        <Login />
      </>
    );
  }

  return (
    <>
      {user?.sub}
      <Button onClick={logout}>Logout</Button>
    </>
  );
}

export default App;
