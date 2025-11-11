// store.ts
import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import counterSlice from "./reducerSlices/counterSlice";
import boxSlice from "./reducerSlices/boxSlice";
import userSlice from "./reducerSlices/userSlice";
import reduxLogger from "redux-logger";
import productSlice from "./reducerSlices/productSlice";
import { TypedUseSelectorHook, useSelector } from "react-redux";

// Combine reducers
const rootReducer = combineReducers({
  counter: counterSlice,
  box: boxSlice,
  user: userSlice,
  product: productSlice,
});

// Persist config
const persistConfig = {
  key: "root",
  storage,
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }).concat(reduxLogger),
});

export const persistor = persistStore(store);

// Types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed selector hook
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
