import Link from "next/link";
import { useRouter } from "next/router";

export default function Breadcrumb({ eventSlug }) {
  const router = useRouter();

  // Split ruten i dele
  const pathParts = router.pathname.split("/").filter((part) => part);

  // Hent dynamiske parametre fra router.query
  const { slug, id } = router.query;

  // Skjul breadcrumbs på forsiden
  if (router.pathname === "/") {
    return null;
  }

  // Oversættelse til specifikke sider
  const staticPages = {
    "/about": "Om os",
    "/login": "Login",
    "/admin": "Admin",
  };

  // Hvis siden er en statisk side, vis kun dens breadcrumb
  if (staticPages[router.pathname]) {
    return (
      <nav className="mt-36 ml-26 text-sm cursor-pointer text-black my-2">
        <span key="home">
          <Link href="/" className="text-black hover:underline">
            Forside
          </Link>
          <span className="mx-2">/</span>
        </span>
        <span>{staticPages[router.pathname]}</span>
      </nav>
    );
  }

  // Dynamisk konstruering af breadcrumbs
  const crumbs = [];

  // Tilføj "Forside"
  crumbs.push(
    <span key="home">
      <Link href="/" className="text-black hover:underline">
        Forside
      </Link>
      <span className="mx-2">/</span>
    </span>
  );

  // Tilføj "Event" for event-relaterede sider
  crumbs.push(
    <span key="event">
      <Link href="/event" className="text-black hover:underline">
        Event
      </Link>
      <span className="mx-2">/</span>
    </span>
  );

  // Tilføj slug fra event
  if (eventSlug || slug) {
    // Gør første bogstav stort direkte
    const formattedSlug = (eventSlug || slug).charAt(0).toLocaleUpperCase("da-DK") + (eventSlug || slug).slice(1);

    crumbs.push(
      <span key="event-slug">
        <Link href={`/events/${eventSlug || slug}`} className="text-black hover:underline">
          {formattedSlug}
        </Link>
        <span className="mx-2">/</span>
      </span>
    );
  }

  // Tilføj "Opgave" for opgavedetaljesider
  if (id) {
    crumbs.push(
      <span key="task">
        <Link href={`/events/${eventSlug || slug}/tasks/${id}`} className="text-black hover:underline">
          Opgave
        </Link>
      </span>
    );
  }

  return <nav className="mt-36 ml-26 text-sm cursor-pointer text-black my-2">{crumbs}</nav>;
}
