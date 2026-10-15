import {
  Input,
  PasswordInput,
  Button,
  CheckboxGroup,
  Checkbox,
  Dropdown,
  Row,
  Grid,
  Col,
} from "rsuite";
// import { useState } from "react";
import { useCreateUser } from "./useCreateUser";
import "../../styles/Components/createUser.scss";

const CreateUser = () => {
  const {
    displayResponse,
    createUserResponse,
    formData,
    handleChange,
    isComplete,
    handleCreateUser,
    setFormData,
  } = useCreateUser();

  return (
    <>
      {/* <h2>Create User:</h2> */}
      <div className="create-user-container">
        <form onSubmit={handleCreateUser}>
          <Grid fluid>
            <Row gutter={50}>
              <Col marginBottom={20}>
                <Input
                  value={formData.user_name}
                  onChange={(val) => handleChange("user_name", val)}
                  placeholder="User Name"
                  name="username"
                />
                <Input
                  value={formData.email}
                  onChange={(val) => handleChange("email", val)}
                  placeholder="Email"
                  name="email"
                />
                <PasswordInput
                  value={formData.password}
                  onChange={(val) => handleChange("password", val)}
                  placeholder="Password"
                  name="password"
                />
                <PasswordInput
                  value={formData.confirmPassword}
                  onChange={(val) => handleChange("confirmPassword", val)}
                  placeholder="Confirm Password"
                  name="confirmPassword"
                />
                {/* </div> */}
              </Col>
              <Col>
                <div className="create-user-access">
                  <Dropdown
                    title={`Access Level: ${formData.access_level.toString()}`}
                    placement="bottomStart"
                  >
                    <Dropdown.Item
                      onClick={() => handleChange("access_level", 0)}
                    >
                      0 - Public
                    </Dropdown.Item>
                    <Dropdown.Item
                      onClick={() => handleChange("access_level", 1)}
                    >
                      1 - Level 1
                    </Dropdown.Item>
                    <Dropdown.Item
                      onClick={() => handleChange("access_level", 2)}
                    >
                      2 - Level 2
                    </Dropdown.Item>
                    <Dropdown.Item
                      onClick={() => handleChange("access_level", 10)}
                    >
                      10 - Admin
                    </Dropdown.Item>
                  </Dropdown>
                  <CheckboxGroup
                    value={formData.isAdmin ? ["admin"] : []}
                    onChange={(val) =>
                      handleChange("isAdmin", val.includes("admin"))
                    }
                  >
                    <Checkbox value="admin">Admin</Checkbox>
                  </CheckboxGroup>
                </div>
              </Col>
            </Row>
            <Row>
              <Col>
                <Button
                  type="button"
                  onClick={() =>
                    setFormData({
                      user_name: "",
                      password: "",
                      confirmPassword: "",
                      email: "",
                      isAdmin: false,
                      access_level: 0,
                    })
                  }
                >
                  Cancel
                </Button>
                <Button
                  appearance="primary"
                  type="submit"
                  disabled={!isComplete}
                >
                  Create User
                </Button>
              </Col>
              {/* </Row> */}
            </Row>
          </Grid>
        </form>
      </div>
      {createUserResponse && displayResponse({ response: createUserResponse })}
    </>
  );
};

export default CreateUser;
