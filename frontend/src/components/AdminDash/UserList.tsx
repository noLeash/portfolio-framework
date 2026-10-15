import { useUserList } from "./useUserList";
import {
  IconButton,
  Dropdown,
  Input,
  ButtonGroup,
  Button,
  Modal,
} from "rsuite";
import "../../styles/Components/userList.scss";
import TrashIcon from "@rsuite/icons/Trash";
import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
// import Dropdown from "rsuite";
import EditIcon from "@rsuite/icons/Edit";
import CopyIcon from "@rsuite/icons/Copy";
import SaveIcon from "@rsuite/icons/Save";
import { useFlash } from "../Flash/useFlash";

const UserList = () => {
  const { flash } = useFlash();
  const {
    userList,
    userListResponse,
    userListError,
    deleteUser,
    deleteUserResponse,
    deleteUserError,
    updateUserLoading,
    deleteUserLoading,
    updateUser,
    updateUserResponse,
    updateUserError,
    fetchUserList,
    handleUpdateAccessLevel,
    handleDeleteUser,
    confirmDeleteUser,
  } = useUserList();
  const [accessLevel, setAccessLevel] = useState<number>(0);
  const { isAuthenticated, isAdmin, user } = useAuth();

  const UserCard = ({ user_val }: { user_val: any }) => {
    const [editEmail, setEditEmail] = useState<boolean>(false);
    const [newEmail, setNewEmail] = useState<string>(user_val.email);
    const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
    return (
      <div id={`user-${user_val.id}`} className="user-card">
        <p>
          <strong>Name:</strong> {user_val.user_name}
        </p>
        <p>
          <strong>Email:</strong> {user_val.email}
          <ButtonGroup size="xs" width={100} style={{ marginLeft: "10px" }}>
            <IconButton
              onClick={() => {
                navigator.clipboard.writeText(user_val.email);
                setEditEmail(!editEmail);
                setNewEmail(user_val.email);
              }}
              icon={<EditIcon />}
            />
            <IconButton
              onClick={() => {
                navigator.clipboard.writeText(user_val.email);
                // setTimeout(() => setEditEmail(false), 2000);
                flash("Email copied to clipboard", "success");
              }}
              icon={<CopyIcon />}
            />
          </ButtonGroup>
          <div>
            {editEmail && (
              <>
                <Input
                  value={newEmail}
                  onChange={(value) => setNewEmail(value)}
                  width="auto"
                />
                <IconButton
                  onClick={() => {
                    // handleUpdateEmail(user_val.id, newEmail);
                    setEditEmail(false);
                    updateUser({
                      url: `/api/admin/updateUser/${user_val.id}`,
                      body: {
                        email: newEmail,
                      },
                    });
                  }}
                  icon={<SaveIcon />}
                />
              </>
            )}
          </div>
        </p>
        <p>
          <strong>Admin:</strong> {user_val.admin ? "Yes" : "No"}
        </p>
        <p>
          <strong>Access Level:</strong> {user_val.access_level}
          <Dropdown title="Change Access Level">
            <Dropdown.Item
              onClick={() => handleUpdateAccessLevel(user_val.id, 1)}
            >
              1
            </Dropdown.Item>
            <Dropdown.Item
              onClick={() => handleUpdateAccessLevel(user_val.id, 2)}
            >
              2
            </Dropdown.Item>
            <Dropdown.Item
              onClick={() => handleUpdateAccessLevel(user_val.id, 3)}
            >
              3
            </Dropdown.Item>
          </Dropdown>
        </p>
        <p>
          <small>ID: {user_val.id}</small>
          <small>ID: {user?.id}</small>
        </p>
        {updateUserError && (
          <p className="error">Error: {updateUserError?.message}</p>
        )}
        {userListError && (
          <p className="error">Error: {userListError?.message}</p>
        )}
        <IconButton
          disabled={user_val.id === user?.id}
          onClick={() => {
            setShowDeleteModal(true);
          }}
          icon={<TrashIcon />}
        />
        <>
          <Modal
            open={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
          >
            <Modal.Header>
              <Modal.Title>
                <div className="alert">CONFIRM DELETE USER:</div>
              </Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {/* Are you sure you want to delete the user{" "} */}

              <h2 className="alert">{user_val.user_name}</h2>
            </Modal.Body>
            <Modal.Footer>
              <Button
                className="alert-button"
                onClick={() => handleDeleteUser(user_val.id)}
                color="red"
              >
                Delete
              </Button>
              <Button onClick={() => setShowDeleteModal(false)} color="blue">
                Cancel
              </Button>
            </Modal.Footer>
          </Modal>
        </>
      </div>
    );
  };

  return (
    <>
      <div id="user-list" className="user-list-container">
        {userListResponse?.map((user) => (
          <>
            <div id={user.id} className="user-card-container">
              <UserCard key={user.id} user_val={user} />
            </div>
          </>
        ))}
      </div>
    </>
  );
};

export default UserList;
