import { useState, useEffect, use } from "react";
import { useFetch } from "../hooks/useFetch";
import { useFlash } from "../Flash/useFlash";
import { useUserList } from "./useUserList";
// import { access } from "fs";

type CreateUserFormData = {
  user_name: string;
  id: string;
  admin: boolean;
  email: string;
  access_level: number;
};

export type CreateUserResponse = {
  message: string;
  user: CreateUserFormData | null;
};

export const useCreateUser = () => {
  const { flash } = useFlash();
  const [formData, setFormData] = useState({
    user_name: "",
    password: "",
    confirmPassword: "",
    email: "",
    isAdmin: false,
    access_level: 0,
  });

  const [showResponse, setShowResponse] = useState(false);

  const {
    data: createUserResponse,
    loading: createUserLoading,
    error: createUserError,
    refetch: createUser,
  } = useFetch<CreateUserResponse>({
    url: "/api/admin/createUser",
    method: "POST",
    params: {},
    body: {
      user_name: formData.user_name,
      password: formData.password,
      email: formData.email,
      admin: formData.isAdmin,
      access_level: formData.access_level,
    },
    manual: true,
  });

  useEffect(() => {
    if (createUserResponse) {
      setShowResponse(true);
      flash(createUserResponse.message, "success");
      const timer = setTimeout(() => setShowResponse(false), 50500);
      return () => clearTimeout(timer);
    }
    if (createUserError) {
      const jsonError = JSON.parse(createUserError?.message || "{}");
      flash(jsonError["detail"] || "Error creating user", "error", 8000);
    }
  }, [createUserResponse, createUserError]);

  const displayResponse = ({ response }: { response: CreateUserResponse }) => {
    return (
      <>
        <div>{showResponse && response?.message}</div>
        <div>Username:</div>
        <b>{showResponse && response?.user?.user_name}</b>
        <div>Access Level:</div>
        <b>{showResponse && response?.user?.access_level}</b>
        <div>Email:</div>
        <b>{showResponse && response?.user?.email}</b>
        <div>Admin:</div>
        <b>{showResponse && (response?.user?.admin ? "True" : "False")}</b>
      </>
    );
  };

  const handleChange = (
    key:
      | "user_name"
      | "password"
      | "confirmPassword"
      | "email"
      | "isAdmin"
      | "access_level",
    val: string | boolean | number,
  ) => {
    setFormData((prev) => ({ ...prev, [key]: val }));
  };

  const isComplete =
    formData.user_name.trim() !== "" &&
    formData.password.trim() !== "" &&
    formData.confirmPassword.trim() !== "" &&
    formData.password === formData.confirmPassword;

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("Creating user with data:", formData);
    await createUser({
      body: {
        user_name: formData.user_name,
        password: formData.password,
        email: formData.email,
        admin: formData.isAdmin,
        access_level: formData.access_level,
      },
    });
  };

  return {
    displayResponse,
    createUserResponse,
    createUserLoading,
    createUserError,
    formData,
    setFormData,
    handleChange,
    isComplete,
    handleCreateUser,
  };
};
