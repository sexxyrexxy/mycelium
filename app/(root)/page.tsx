import "../assets/styles/globals.css";
import Image from "next/image";

const Homepage = () => {
  return (
    <div className="flex-between">
      <div className="flex-col">
        <div className="font-bold text-3xl">Mycelium</div>
        <div className="text-2xl">A look into the mushroom mind</div>
      </div>
      <div style={{ borderRadius: "5px", overflow: "hidden" }}>
        <Image
          src="/images/landing-page-image.jpg"
          alt="image mushroom"
          width={700}
          height={700}
          priority={true}
        />
      </div>
    </div>
  );
};

export default Homepage;
