import "../assets/styles/globals.css";
import Image from "next/image";
import MushroomCard from "@/components/shared/mushroom/mushroom-card";
import { Button } from "@/components/ui/button";

const Homepage = () => {
  return (
    <>
      <div className="h-[500px] relative">
        <Image
          src="/images/landing-page-image.jpg"
          alt="image mushroom"
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />

        {/* Overlay text */}
        <div className="absolute inset-0 flex flex-col items-start justify-center text-white wrapper">
          <h1 className="font-bold text-5xl drop-shadow-lg">Mycelium</h1>
          <p className="text-2xl mt-4 drop-shadow-lg">
            A look into the mushroom mind
          </p>
        </div>
      </div>
      <div className="p-5">
        <div className=" grid grid-cols-4 gap-4">
          <MushroomCard />
          <MushroomCard />
          <MushroomCard />
          <MushroomCard />
          <MushroomCard />
        </div>
      </div>
    </>
  );
};

export default Homepage;
