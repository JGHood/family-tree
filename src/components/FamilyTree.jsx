import React, {useState, useEffect, useLayoutEffect, useRef} from "react";
import f3 from "family-chart";
import data from '../data.json';
import '../styles/treeStyles.css';
import { useHistory } from "react-router-dom";

export default function FamilyTree(treeProps) {
  const history = useHistory();
  const [ref, setRef] = useState();
  const [store, setStore] = useState();
  const [id, setId] = useState();

  useEffect(() => {
    if (!ref) return;
    const store = f3.createStore({
        data: data,
        cont: ref,
        card_display: [
          (d) => `${d.data.firstName} ${d.data.lastName}` || "",
          (d) => `${d.data.birthDate} - ${d.data.deathDate}` || "",
          (d) => `Born: ${d.data.birthPlace}`
        ],
        mini_tree: treeProps.minified,
        hide_rels: false,
        node_separation: 400,
        level_separation: 250,
        card_dim: {
          w: 300,
          h: 80,
          text_x: 75,
          text_y: 15,
          img_w: 60,
          img_h: 60,
          img_x: 5,
          img_y: 5
        }
      }),
      view = f3.d3AnimationView(store);
    setStore(store);
    store.setOnUpdate((props) =>
      view.update({ tree: store.state.tree, ...(props || {}) })
    );
    store.update.tree();
  }, [ref, treeProps]);

  if(store) {
    store.state.cont.querySelector(".main_svg").addEventListener("click", e => {
      console.log('testing');
      const node = e.target;
      if (node.closest('.card_family_tree')) return
      if(node.closest('.card_break_link')) return
      if(!node.closest('.card')) return
      const card = node.closest('.card');
      const id = card.getAttribute("data-id");
      setId(id);
    });
  }
  if(id) {
    history.push(`/member/${id}`);
  }
    return <div className="family-chart" ref={newRef => setRef(newRef)}></div>;
}
