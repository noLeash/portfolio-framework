// import { get } from "http";
import { useEffect } from "react";
import Modal from "rsuite/esm/internals/Overlay/Modal";
import { useFetch } from "../hooks/useFetch";
// import FlashMessage from "../Flash/Flash";
import { useFlash } from "../Flash/useFlash";
import { Button, IconButton } from "rsuite";

type User = {
  id: string;
  user_name: string;
  email: string;
  admin: boolean;
  access_level: number;
};

// type UserListResponse = {
//   users: User[];
// };

export const useUserList = () => {
  const { flash } = useFlash();
  const {
    data: userListResponse,
    error: userListError,
    loading: userListLoading,
    refetch: fetchUserList,
  } = useFetch<User[]>({
    url: "/api/admin/allUsers",
    method: "GET",
    manual: true,
  });

  const confirmDeleteUser = (userId: number, name: string) => {
    return (
      <>
        <Modal open={true} onClose={() => {}}>
          <Modal.Header>
            <Modal.Title>Confirm Delete</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            Are you sure you want to delete the user {name}?
          </Modal.Body>
          <Modal.Footer>
            <Button onClick={() => handleDeleteUser(userId)} color="red">
              Delete
            </Button>
            <Button onClick={() => {}} color="blue">
              Cancel
            </Button>
          </Modal.Footer>
        </Modal>
      </>
    );
  };

  const handleUpdateAccessLevel = async (
    userId: number,
    newAccessLevel: number,
  ) => {
    const result = await updateUser({
      url: `/api/admin/updateUser/${userId}`,
      body: {
        access_level: newAccessLevel,
      },
    });
    if (!result.success) {
      console.error("Failed to update access level:", updateUserError);
      flash("Failed to update access level", "error");
    } else {
      console.log("Access level updated successfully");
      flash("Access level updated successfully", "success", 5000);
      fetchUserList(); // Refresh the user list after updating
    }
  };

  const handleDeleteUser = async (userId: number) => {
    const result = await deleteUser({
      url: `/api/admin/deleteUser/${userId}`,
    });
    if (!result.success) {
      console.error("Failed to delete user:", deleteUserError);
      flash("Failed to delete user", "error");
    } else {
      console.log("User deleted successfully");
      flash("User deleted successfully", "success", 5000);
      fetchUserList(); // Refresh the user list after deletion
    }
  };

  const {
    data: deleteUserResponse,
    error: deleteUserError,
    loading: deleteUserLoading,
    refetch: deleteUser,
  } = useFetch<{ success: boolean; message?: string }>({
    url: "/api/admin/deleteUser",
    method: "DELETE",
    manual: true,
  });

  const {
    data: updateUserResponse,
    error: updateUserError,
    loading: updateUserLoading,
    refetch: updateUser,
  } = useFetch<{ success: boolean; user?: User }>({
    url: "/api/admin/updateUser",
    method: "PATCH",
    manual: true,
  });

  useEffect(() => {
    fetchUserList();
  }, [
    updateUser,
    deleteUser,
    updateUser,
    deleteUserResponse,
    updateUserResponse,
  ]);

  useEffect(() => {
    if (userListError) {
      // console.error("Failed to fetch user list:", userListError);
      flash("Failed to fetch user list", "error", 5000);
    }
    if (updateUserError) {
      // console.error("Failed to update user:", updateUserError);
      flash("Failed to update user", "error", 5000);
    }
    if (deleteUserError) {
      // console.error("Failed to delete user:", deleteUserError);
      flash("Failed to delete user", "error", 5000);
    }
    if (updateUserResponse && !updateUserResponse.success) {
      // console.error("Failed to update user:", updateUserResponse?.message);
      flash("Failed to update user: " + updateUserResponse, "error", 5000);
    }
    if (deleteUserResponse && !deleteUserResponse.success) {
      // console.error("Failed to delete user:", deleteUserResponse?.message);
      flash(
        "Failed to delete user: " + deleteUserResponse?.message,
        "error",
        5000,
      );
    }
    if (updateUserResponse && updateUserResponse.success) {
      // console.log("User updated successfully");
      flash("User updated successfully", "success", 5000);
    }
    if (deleteUserResponse && deleteUserResponse.success) {
      // console.log("User deleted successfully");
      flash("User deleted successfully", "success", 5000);
    }
  }, [
    userListError,
    updateUserError,
    deleteUserError,
    updateUserResponse,
    deleteUserResponse,
    flash,
  ]);

  return {
    userList: userListResponse ?? [],
    userListResponse,
    userListError,
    userListLoading,
    fetchUserList,
    confirmDeleteUser,
    deleteUserResponse,
    deleteUserError,
    deleteUserLoading,
    deleteUser,
    updateUserResponse,
    updateUserError,
    updateUserLoading,
    updateUser,
    handleUpdateAccessLevel,
    handleDeleteUser,
  };
};
