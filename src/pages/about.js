import Image from "next/image";
import localFont from "next/font/local";
import Link from "next/link";
import Socials from "./components/Socials";
import Head from "next/head";
import Card from "./components/Card";

export default function Home() {
  return (
    <>
      <Head>
        <title>Om os</title>
        <meta name="description" content="Om os siden der fortæller hvem vi er" />
      </Head>

      <main className="max-w-4xl mx-auto text-center px-4 mt-20 py-10">
        <h1 className="text-4xl font-bebas font-bold text-bono-10 mb-6">Om Os</h1>
        <p className="text-lg text-bono-10 font-montserrat leading-relaxed mb-4">Velkommen til VIF Support – stedet, hvor fællesskab og frivillighed går hånd i hånd. Vi er her for at skabe de bedste oplevelser for både deltagere og frivillige. Uden jeres hjælp og gode humør kunne vi ikke få det hele til at lykkes!</p>
        <p className="text-lg text-bono-10 font-montserrat leading-relaxed mb-6">Vores mål er at gøre det nemt og overskueligt at finde frivillige opgaver, tilmelde sig arrangementer og være med til at løfte i flok. Sammen kan vi skabe velorganiserede og mindeværdige events, hvor alle føler sig velkomne.</p>

        <h2 className="text-3xl font-semibold font-bebas text-bono-10 mt-8 mb-4">Hvad Forventer Vi?</h2>
        <p className="text-lg text-gray-600 font-montserrat leading-relaxed mb-6">Når du melder dig som frivillig hos os, forventer vi nogle grundlæggende værdier som godt humør, ansvarlighed og samarbejdsvilje. Du kan læse mere om, hvad vi lægger vægt på i vores værdikort herunder.</p>

        <div className="flex flex-wrap justify-center gap-6">
          <Card />
        </div>
      </main>
    </>
  );
}
