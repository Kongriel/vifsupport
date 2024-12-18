import Image from "next/image";
import localFont from "next/font/local";
import Link from "next/link";
import Socials from "./components/Socials";
import Head from "next/head";

export default function Home() {
  return (
    <>
      <Head>
        <title>Viffsupport Startside</title>
        <meta name="description" content="Forsiden på VifSupport side" />
      </Head>
      <div className="flex min-h-screen md:pl-6 md:mt-16 md:pr-6 flex-col md:flex-row items-center justify-center  ">
        {/* Billede */}
        <div className="w-full md:-mt-4 -mt-16  md:w-1/2">
          <Image src="/sforside.jpg" alt="VIF Gymnastik" width={500} height={500} className="object-cover rounded-lg w-full h-auto" />
        </div>

        {/* Tekst og knap */}

        <div className="text-center md:text-center mt-8 md:w-1/2 px-6">
          <h1 className=" text-4xl font-bebas font-bold mb-5 text-bono-10 align-center">Velkommen Til VIF Supportere</h1>

          <p className="text-lg mb-8 font-montserrat font-semibold text-bono-10">Her på siden finder du løbende frivillige opgaver, som du kan tilmelde dig og være med til at gøre en forskel. </p>

          <Link className="relative pb-16" href="/event">
            <span className="absolute -top-0.5 left-1  h-10 w-48 rounded bg-black"></span>
            <span className="fold-bold relative inline-block h-12 w-48 pt-2.5 rounded border-2 border-black bg-blue-300 px-3 py-1 text-base font-bold text-black transition duration-100 hover:bg-blue-500 hover:-translate-y-1 hover:-translate-x-1  hover:text-white">Se Eventliste</span>
          </Link>
        </div>
      </div>
    </>
  );
}
