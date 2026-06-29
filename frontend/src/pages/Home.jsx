import { useSelector } from "react-redux";
import DeliveryBoy from "../components/DeliveryBoy";
import OwnerDashboard from "../components/OwnerDashboard";
import UserDashboard from "../components/UserDashboard";
import LiveDeliveryPopup from "../components/LiveDeliveryPopup";

function Home() {
  const { userData } = useSelector((state) => state.user);

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 via-yellow-50 to-amber-50">
      {userData.role == "user" && (
        <>
          <UserDashboard />
          <LiveDeliveryPopup />
        </>
      )}
      {userData.role == "owner" && <OwnerDashboard />}
      {userData.role == "deliveryBoy" && <DeliveryBoy />}
    </div>
  );
}

export default Home;

//? 5hrs 3mins


