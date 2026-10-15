import { useLoaderData } from "react-router";
import AppBootstrap from "../components/AppBootstrap/AppBootstrap";
import { useAppBootstrap } from "../components/AppBootstrap/useAppBootstrap";

export async function clientLoader() {
  return { message: "Hello from clientLoader" };
}

export default function Dashboard() {
  const data = useLoaderData() as { message: string };
  const {} = useAppBootstrap();
  return (
    <>
      <h1> Dashboard:</h1>
      <AppBootstrap />
    </>
  );
}
