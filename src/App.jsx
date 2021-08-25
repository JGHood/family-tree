import React, { useState, useEffect } from "react";
import FamilyTree from "./components/FamilyTree";
import { BrowserRouter, Switch, Route, useLocation } from "react-router-dom";
export default function App() {
  const [minified, setMinified] = useState(true);
  const [updater, setUpdate] = useState(true);
  const location = useLocation();
  useEffect(() => {
    setUpdate(!updater);
    console.log("I did it");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location])
  if(updater || !updater) {
    return (
      <div className="App">
          <Switch>
            <Route exact path="/">
              <FamilyTree minified={minified} />
            </Route>
            <Route exact path = "/member/:id">
              Hello
            </Route>
          </Switch>
      </div>
    );
  }

}
