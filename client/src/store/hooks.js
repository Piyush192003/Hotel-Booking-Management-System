import { useDispatch, useSelector } from 'react-redux';

export const useAppDispatch = () => useDispatch();
export const useAppSelector = () => useSelector((state) => state);

export function useAuth() {
  return useSelector((state) => state.auth);
}

export default useAppDispatch;
