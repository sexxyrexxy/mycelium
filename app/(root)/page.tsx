import "../assets/styles/globals.css";
import Image from "next/image";
import MushroomCard from "@/components/shared/muhsroom/mushroom-card";
import { Button } from "@/components/ui/button";

const Homepage = () => {
  return (
    <>
      <div className="w-full h-[500px] relative">
        <Image
          src="/images/landing-page-image.jpg"
          alt="image mushroom"
          width={1920}
          height={500}
          className="w-full h-[500px] object-cover"
          sizes="100vw"
        />

        {/* Overlay text */}
        <div className="absolute inset-0 flex flex-col items-start justify-center text-white text-center wrapper">
          <h1 className="font-bold text-5xl drop-shadow-lg">Mycelium</h1>
          <p className="text-2xl mt-4 drop-shadow-lg">
            A look into the mushroom mind
          </p>
        </div>
      </div>
      <div className="wrapper">
        <MushroomCard />
      </div>
    </>
  );
};

export default Homepage;
