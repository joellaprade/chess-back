// import { NextResponse, NextRequest } from "next/server";

// export async function middleware(req: NextRequest) {
//   const result = await fetch(`${req.nextUrl.origin}/api/validate-session`, {
//     headers: {
//       cookie: req.headers.get("cookie") || "",
//     },
//   });
//   const { isValidSession } = await result.json();
//   const { pathname } = req.nextUrl;
//   const unprotectedRoutes = [
//     "/",
//     "/login",
//     "/signup",
//     "/about",
//     "/verify-account",
//     "/change-password",
//     "/change-password/request",
//   ];
//   const isProtectedRoute = !unprotectedRoutes.includes(pathname);

//   if (!isValidSession && isProtectedRoute) return NextResponse.redirect(new URL("/", req.url));

//   if (isValidSession && pathname == "/") return NextResponse.redirect(new URL("/home", req.url));
// }

// export const config = {
//   matcher: ["/((?!_next/|api/|assets/|favicon).*)"],
// };
