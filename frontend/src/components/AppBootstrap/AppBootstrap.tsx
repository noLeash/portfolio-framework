import "../../styles/Components/bootstrap.scss";
import type { BootstrapCheck } from "./useAppBootstrap";
import { useFetch } from "../hooks/useFetch";
import { Grid, Row, Col } from "rsuite";
import { useAppBootstrap } from "./useAppBootstrap";
import CheckOutlineIcon from "@rsuite/icons/CheckOutline";
import RemindFillIcon from "@rsuite/icons/RemindFill";

type StatusBlockProps = {
  title: string;
  status: BootstrapCheck | null;
  loading?: boolean;
  error?: string;
};

const StatusBlock = ({ title, status }: StatusBlockProps) => {
  return (
    <>
      <div>
        <Row>{title}</Row>
        <Row>{status?.ok ? <CheckOutlineIcon /> : <RemindFillIcon />}</Row>
        <Row>{status?.message ? status.message : "-"}</Row>
        <Row>{status?.error ? status.error : null}</Row>
      </div>
    </>
  );
};

const AppBootstrap = () => {
  const { CreateFirstUserModal } = useAppBootstrap();
  const {
    data: apiHealth,
    loading: apiHealthLoading,
    error: apiHealthError,
  } = useFetch<BootstrapCheck>({
    url: "/api/bootstrap/apiStatus",
  });

  const {
    data: dbStatus,
    loading: dbStatusLoading,
    error: dbStatusError,
  } = useFetch<BootstrapCheck>({
    url: "/api/bootstrap/dbStatus",
  });

  const {
    data: adminExists,
    loading: adminExistsLoading,
    error: adminExistsError,
  } = useFetch<BootstrapCheck>({
    url: "/api/bootstrap/adminExists",
  });

  return (
    <>
      <div>
        {/* Bootstrap */}
        <Grid className="status">
          <Row gutter={50} className="status-box">
            <Col span={8}>
              <StatusBlock title="API Status" status={apiHealth ?? null} />
            </Col>
            {apiHealthError ? (
              "Error Checking API Health"
            ) : apiHealthLoading ? (
              "Loading API Health"
            ) : apiHealth?.ok ? (
              <Col span={8}>
                <StatusBlock
                  title="Database Status"
                  status={dbStatus ?? null}
                />
              </Col>
            ) : (
              "Awaiting API Connection..."
            )}
            <Col span={8}>
              <StatusBlock title="Admin Count" status={adminExists ?? null} />
            </Col>
          </Row>
        </Grid>
        {!adminExists?.ok && <CreateFirstUserModal open={!adminExists?.ok || false} />}
      </div>
    </>
  );
};

export default AppBootstrap;
