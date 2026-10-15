import { Modal, Button, Form, Schema, Message } from "rsuite";
import { useFetch } from "../hooks/useFetch";
import { Navigate } from "react-router";
import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

export type FirstUserProps = {
  user: string;
  password: string;
  passwordConfirm: string;
  email: string;
};

export type BootstrapCheck = {
  ok: boolean;
  message?: string;
  error?: string;
};

type CreateFirstUserModalProps = {
  open: boolean;
  onClose?: () => void;
};

const { StringType } = Schema.Types;

const model = Schema.Model({
  user: StringType().isRequired("Username is required"),
  email: StringType()
    .isEmail("Please enter a valid email address")
    .isRequired("Email is required"),
  password: StringType()
    .minLength(8, "Password must be at least 8 characters")
    .isRequired("Password is required"),
  passwordConfirm: StringType()
    .addRule((value, data) => value === data.password, "Passwords do not match")
    .isRequired("Please confirm your password"),
});

export const useAppBootstrap = () => {
  const [showModal, setShowModal] = useState<boolean>(true);
  const {
    data: firstAdminResponse,
    error: firstAdminError,
    loading: firstAdminLoading,
    refetch: postFirstUser,
  } = useFetch<unknown, FirstUserProps>({
    url: "/api/bootstrap/createFirstAdmin",
    method: "POST",
    manual: true,
  });

  const navigate = Navigate;
  const CreateFirstUserModal = ({}: CreateFirstUserModalProps) => {
    const [formValue, setFormValue] = useState<FirstUserProps>({
      user: "",
      email: "",
      password: "",
      passwordConfirm: "",
    });

    const [formError, setFormError] = useState<Record<string, string>>({});

    const submitUser = async () => {
      const isValid = model.check(formValue);

      if (!isValid) {
        return;
      }

      try {
        await postFirstUser({ body: formValue });
      } catch {
        // backend error already handled by useFetch
      } finally {
        setShowModal(false);
        navigate({ to: "/" });
      }
    };

    return (
      <Modal open={showModal} onClose={() => setShowModal(false)}>
        <Modal.Header>
          <Modal.Title>Create First Admin</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form
            fluid
            formValue={formValue}
            onChange={(value) => setFormValue(value as FirstUserProps)}
            onCheck={(errors) => setFormError(errors as Record<string, string>)}
            model={model}
          >
            <Form.Group controlId="user">
              <Form.Label>User</Form.Label>
              <Form.Control name="user" placeholder="abc123" />
            </Form.Group>

            <Form.Group controlId="email">
              <Form.Label>Email</Form.Label>
              <Form.Control name="email" placeholder="abc123@xyz.com" />
            </Form.Group>

            <Form.Group controlId="password">
              <Form.Label>Password</Form.Label>
              <Form.Control
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="******"
              />
            </Form.Group>

            <Form.Group controlId="passwordConfirm">
              <Form.Label>Password Confirm</Form.Label>
              <Form.Control
                name="passwordConfirm"
                type="password"
                autoComplete="new-password"
                placeholder="******"
              />
            </Form.Group>
          </Form>

          {firstAdminError && (
            <Message type="error" showIcon>
              {firstAdminError.message}
            </Message>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button
            disabled={Object.keys(formError).length > 0}
            appearance="primary"
            onClick={submitUser}
            loading={firstAdminLoading}
          >
            Submit
          </Button>
        </Modal.Footer>
      </Modal>
    );
  };

  return { CreateFirstUserModal };
};
