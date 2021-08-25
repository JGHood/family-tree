import React, { useState } from 'react';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import FamilyTree from "./FamilyTree";
import nodes from '../data.json';
import ReactFamilyTree from 'react-family-tree';


const TreeItem = ({ node, isRoot, onSubClick, style }) => {
  return (
    <div style={style}>
      <div>
        {node.name}
      </div>
    </div>
  );
}

export default function ScrollFrame() {
  const [rootId, setRootId] = useState("kuVISwh7w");
  return (
    <TransformWrapper
      defaultScale={1}
      defaultPositionX={200}
      defaultPositionY={100}
    >
      {(props) => (
        <>
          <div className="tools">
            <button onClick={() => props.zoomIn()}>+</button>
            <button onClick={() => props.zoomOut()}>-</button>
            <button onClick={() => props.resetTransform()}>x</button>
          </div>
          <TransformComponent style={{ minWidth: '100vw', minHeight: '100vh' }}>
            <ReactFamilyTree
              nodes={nodes}
              width={70}
              height={80}
              rootId={rootId}
              renderNode={(node) => (
                <TreeItem
                  key={node.id}
                  node={node}
                  isRoot={node.id === rootId}
                  onSubClick={setRootId}
                  style={{
                    width: 70,
                    height: 80,
                    color: 'blue',
                    backgroundColor: 'green',
                    transform: `translate(${node.left * (70 / 2)}px, ${node.top * (80 / 2)}px)`,
                  }}
                />
              )}
            />
          </TransformComponent>
        </>
      )}
    </TransformWrapper>
  );
}
