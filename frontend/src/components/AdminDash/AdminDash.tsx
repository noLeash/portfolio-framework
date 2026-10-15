import UserList from "./UserList";
import AppBootstrap from "../AppBootstrap/AppBootstrap";
import { useAuth } from "../hooks/useAuth";
import CreateUser from "./CreateUser";

import { Accordion } from "rsuite";
const AdminDash = () => {
  const { isAuthenticated, isAdmin } = useAuth();
  return (
    <>
      {isAuthenticated && isAdmin && (
        <>
          <h2>Admin Dash</h2>
          <Accordion>
            <Accordion.Panel
              overflow={"auto"}
              header="User List"
              defaultExpanded={false}
            >
              <UserList />
            </Accordion.Panel>
            <Accordion.Panel header="Create User" defaultExpanded={true}>
              <CreateUser />
            </Accordion.Panel>
            <Accordion.Panel header="Site Status" defaultExpanded={true}>
              <AppBootstrap />
            </Accordion.Panel>
          </Accordion>
        </>
      )}
    </>
  );
};

export default AdminDash;
