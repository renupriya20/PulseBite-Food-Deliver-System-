import axios from "axios";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setAddress, setLocation } from "../redux/slices/mapSlice";
import {
  setCity,
  setCurrentAddress,
  setState,
} from "../redux/slices/userSlice";

function useGetCity() {
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);
  const apiKey = import.meta.env.VITE_GEOAPIFY_API_KEY;

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(async (position) => {
      //   console.log(position);
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      dispatch(setLocation({ lat: latitude, lon: longitude }));

      if (!apiKey) return;

      const result = await axios.get(
        `https://api.geoapify.com/v1/geocode/reverse?lat=${latitude}&lon=${longitude}&format=json&apiKey=${apiKey}`,
      );

      //   console.log(result.data);

      dispatch(
        setCity(
          result?.data?.results[0].city || result?.data?.results[0].county,
        ),
      );

      dispatch(setState(result?.data?.results[0].state));

      dispatch(
        setCurrentAddress(
          result?.data?.results[0].address_line2 ||
          result?.data?.results[0].address_line1,
        ),
      );

      // console.log(result?.data?.results[0].address_line2);


      dispatch(setAddress(result?.data?.results[0].address_line2));
    });
  }, [apiKey, dispatch, userData]);
}

export default useGetCity;
