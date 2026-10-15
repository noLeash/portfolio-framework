import { useLogin } from "./useLogin";
import AppBootstrap from "../AppBootstrap/AppBootstrap";
import { PasswordInput, Input, Button } from "rsuite";
import "../../styles/Components/login.scss";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router";
import { useState } from "react";

const Login = () => {
  const { res, loginError, adminExists, formData, setFormData } = useLogin();
  const { user, logout, login, isAuthenticated } = useAuth();
  const [showBootstrap, setShowBootstrap] = useState(false);
  const navigate = useNavigate();

  const handleChange = (key: "username" | "password", val: string) => {
    setFormData((prev) => ({ ...prev, [key]: val }));
  };

  const isComplete =
    formData.username.trim() !== "" && formData.password.trim() !== "";

  const handleLogin = async () => {
    const result = await login(formData.username, formData.password);
    if (!result.success) {
      console.error("Login failed:", result.error);
    } else {
      navigate("/");
    }
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isComplete) return;
    await handleLogin();
  };
  // timeout before showing bootstrap to avoid flash of bootstrap on load when user is not authenticated
  setTimeout(() => {
    if (!adminExists?.ok) {
      setShowBootstrap(true);
    }
  }, 1000);

  if (isAuthenticated) {
    return (
      <div className="login-container">
        <Button type="button" onClick={logout}>
          Logout
        </Button>
      </div>
    );
  }
  if (!adminExists?.ok) {
    return <AppBootstrap />;
  }

  if (!isAuthenticated) {
    return (
      <div className="login-container">
        test update
        <form onSubmit={onSubmit}>
          <Input
            value={formData.username}
            onChange={(val) => handleChange("username", val)}
            placeholder="User Name"
            name="username"
          />
          <PasswordInput
            value={formData.password}
            onChange={(val) => handleChange("password", val)}
            placeholder="Password"
            name="password"
          />
          <Button appearance="primary" type="submit" disabled={!isComplete}>
            Login
          </Button>
          {isAuthenticated && (
            <Button type="button" onClick={logout}>
              Logout
            </Button>
          )}
          {loginError && <div className="error">{loginError}</div>}
        </form>
      </div>
    );
  }
};

export default Login;
