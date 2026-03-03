import { redirect } from "next/navigation";

export default function AdminHome() {
    // always redirect to login page for now; dashboard will handle auth check
    redirect("/login");
}
