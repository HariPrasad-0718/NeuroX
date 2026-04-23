import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";

const PUBLIC_ROUTES = ["/login", "/signup"];

function isPublicPath(pathname) {
	return PUBLIC_ROUTES.some((route) => pathname === route);
}

export async function middleware(request) {
	const { pathname } = request.nextUrl;

	if (
		pathname.startsWith("/_next") ||
		pathname.startsWith("/api") ||
		pathname === "/favicon.ico"
	) {
		return NextResponse.next();
	}

	const sessionUser = await getUserFromRequest(request);
	const isAuthenticated = Boolean(sessionUser?.userId);

	if (!isAuthenticated && !isPublicPath(pathname)) {
		return NextResponse.redirect(new URL("/login", request.url));
	}

	if (isAuthenticated && isPublicPath(pathname)) {
		return NextResponse.redirect(new URL("/dashboard", request.url));
	}

	const dashboardUserRoute = pathname.match(/^\/dashboard\/(\d+)$/);
	if (dashboardUserRoute) {
		if (Number(dashboardUserRoute[1]) !== Number(sessionUser?.userId)) {
			return NextResponse.redirect(new URL("/login", request.url));
		}
		return NextResponse.redirect(new URL("/dashboard", request.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
