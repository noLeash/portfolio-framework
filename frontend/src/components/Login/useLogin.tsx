import { useFetch } from "../hooks/useFetch";
import type { BootstrapCheck } from "../AppBootstrap/useAppBootstrap";
import { useState } from "react";

type UserLogin = {
  username: string;
  password: string;
};

type TokenResponse = {
  access_token: string;
  token_type: string;
};

export const useLogin = () => {
  const [loginError, setLoginError] = useState<string>("");
  const [formData, setFormData] = useState<UserLogin>({
    username: "",
    password: "",
  });
  const [loginResponse, setLoginResponse] = useState<TokenResponse | null>(
    null,
  );

  const [res, setRes] = useState<TokenResponse | null>(null);

  const {
    data: adminExists,
    loading: adminExistsLoading,
    error: adminExistsError,
  } = useFetch<BootstrapCheck | null>({
    url: "/api/bootstrap/adminExists",
    method: "GET",
  });

  return {
    res,
    // submitCreds,
    loginError,
    adminExists,
    adminExistsLoading,
    adminExistsError,
    formData,
    setFormData,
  };
};
