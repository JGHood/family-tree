// https://donatso.github.io/family-chart/ v0.0.0-alpha-7 Copyright 2021 Donat Soric
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('d3')) :
  typeof define === 'function' && define.amd ? define(['d3'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.f3 = factory(global.f3));
  }(this, (function (_d3) { 'use strict';
  
  function _interopNamespace(e) {
  if (e && e.__esModule) return e;
  var n = Object.create(null);
  if (e) {
  Object.keys(e).forEach(function (k) {
  if (k !== 'default') {
  var d = Object.getOwnPropertyDescriptor(e, k);
  Object.defineProperty(n, k, d.get ? d : {
  enumerable: true,
  get: function () {
  return e[k];
  }
  });
  }
  });
  }
  n['default'] = e;
  return Object.freeze(n);
  }
  
  var _d3__namespace = /*#__PURE__*/_interopNamespace(_d3);
  
  var d3 = typeof window === "object" && !!window.d3 ? window.d3 : _d3__namespace;
  
  function isAllRelativeDisplayed(d, data) {
    const r = d.data.rels,
      all_rels = [r.father, r.mother, ...(r.spouses || []), ...(r.children || [])].filter(v => v);
  
    return all_rels.every(rel_id => data.some(d => d.data.id === rel_id))
  }
  
  function sortChildrenWithSpouses(data) {
    data.forEach(datum => {
      if (!datum.rels.children) return
      datum.rels.children.sort((a, b) => {
        const a_d = data.find(d => d.id === a),
          b_d = data.find(d => d.id === b),
          a_p2 = otherParent(a_d, datum, data) || {},
          b_p2 = otherParent(b_d, datum, data) || {},
          a_i = datum.rels.spouses.indexOf(a_p2.id),
          b_i = datum.rels.spouses.indexOf(b_p2.id);
  
        if (datum.data.gender === "M") return a_i - b_i
        else return b_i - a_i
      });
    });
  }
  
  function otherParent(d, p1, data) {
    return data.find(d0 => (d0.id !== p1.id) && ((d0.id === d.rels.mother) || (d0.id === d.rels.father)))
  }
  
  function calculateEnterAndExitPositions(d, entering, exiting) {
    d.exiting = exiting;
    if (entering) {
      if (d.depth === 0) {d._x = d.x; d._y = d.y;}
      else if (d.added) {d._x = d.spouse.x; d._y = d.spouse.y;}
      else if (d.is_ancestry) {d._x = d.parent.x; d._y = d.parent.y;}
      else {d._x = d.parent.x; d._y = d.parent.y;}
    } else if (exiting) {
      const x = d.x > 0 ? 1 : -1,
        y = d.y > 0 ? 1 : -1;
      {d._x = d.x+400*x; d._y = d.y+400*y;}
    }
  }
  
  function toggleRels(tree_datum, hide_rels) {
    const
      rels = hide_rels ? 'rels' : '_rels',
      rels_ = hide_rels ? '_rels' : 'rels';
    
    if (tree_datum.is_ancestry || tree_datum.data.main) {showHideAncestry('father'); showHideAncestry('mother');}
    else {showHideChildren();}
  
    function showHideAncestry(rel_type) {
      if (!tree_datum.data[rels] || !tree_datum.data[rels][rel_type]) return
      if (!tree_datum.data[rels_]) tree_datum.data[rels_] = {};
      tree_datum.data[rels_][rel_type] = tree_datum.data[rels][rel_type];
      delete tree_datum.data[rels][rel_type];
    }
  
    function showHideChildren() {
      if (!tree_datum.data[rels] || !tree_datum.data[rels].children) return
      const
        children = tree_datum.data[rels].children.slice(0),
        spouses = tree_datum.spouse ? [tree_datum.spouse] : tree_datum.spouses || [];
  
      [tree_datum, ...spouses].forEach(sp => children.forEach(ch_id => {
        if (sp.data[rels].children.includes(ch_id)) {
          if (!sp.data[rels_]) sp.data[rels_] = {};
          if (!sp.data[rels_].children) sp.data[rels_].children = [];
          sp.data[rels_].children.push(ch_id);
          sp.data[rels].children.splice(sp.data[rels].children.indexOf(ch_id), 1);
        }
      }));
    }
  }
  
  function toggleAllRels(tree_data, hide_rels) {
    tree_data.forEach(d => {d.data.hide_rels = hide_rels; toggleRels(d, hide_rels);});
  }
  
  function CalculateTree({data_stash, main_id=null, is_vertical=true, node_separation=250, level_separation=150}) {
    data_stash = createRelsToAdd(data_stash);
    sortChildrenWithSpouses(data_stash);
    const main = main_id !== null ? data_stash.find(d => d.id === main_id) : data_stash[0],
      tree_children = calculateTreePositions(main, 'children', false),
      tree_parents = calculateTreePositions(main, 'parents', true);
  
    data_stash.forEach(d => d.main = d === main);
    levelOutEachSide(tree_parents, tree_children);
    const tree = mergeSides(tree_parents, tree_children);
    setupChildrenAndParents({tree});
    setupSpouses({tree, node_separation});
    nodePositioning({tree, is_vertical});
  
    const dim = calculateTreeDim(tree, node_separation, level_separation, is_vertical);
  
    return {data: tree, data_stash, dim}
  
    function calculateTreePositions(datum, rt, is_ancestry) {
      const hierarchyGetter = rt === "children" ? hierarchyGetterChildren : hierarchyGetterParents,
        d3_tree = d3.tree().nodeSize([node_separation, level_separation]).separation(separation),
        root = d3.hierarchy(datum, hierarchyGetter);
      d3_tree(root);
      return root.descendants()
  
      function separation(a, b) {
        let offset = 1;
        if (!is_ancestry) {
          if (!sameParent(a, b)) offset+=.25;
          if (someSpouses(a,b)) offset+=offsetOnPartners(a,b);
          if (sameParent(a, b) && !sameBothParents(a,b)) offset+=.125;
        }
        return offset
      }
      function sameParent(a, b) {return a.parent == b.parent}
      function sameBothParents(a, b) {return (a.data.rels.father === b.data.rels.father) && (a.data.rels.mother === b.data.rels.mother)}
      function hasSpouses(d) {return d.data.rels.spouses && d.data.rels.spouses.length > 0}
      function someSpouses(a, b) {return hasSpouses(a) || hasSpouses(b)}
  
      function hierarchyGetterChildren(d) {
        return [...(d.rels.children || [])].map(id => data_stash.find(d => d.id === id))
      }
  
      function hierarchyGetterParents(d) {
        return [d.rels.father, d.rels.mother]
          .filter(d => d).map(id => data_stash.find(d => d.id === id))
      }
  
      function offsetOnPartners(a,b) {
        return (Math.max((a.data.rels.spouses || []).length, (b.data.rels.spouses || []).length))*.5+.5
      }
    }
  
    function levelOutEachSide(parents, children) {
      const mid_diff = (parents[0].x - children[0].x) / 2;
      parents.forEach(d => d.x-=mid_diff);
      children.forEach(d => d.x+=mid_diff);
    }
  
    function mergeSides(parents, children) {
      parents.forEach(d => {d.is_ancestry = true;});
      parents.forEach(d => d.depth === 1 ? d.parent = children[0] : null);
  
      return [...children, ...parents.slice(1)];
    }
    function nodePositioning({tree, is_vertical}) {
      tree.forEach(d => {
        d.y *= (d.is_ancestry ? -1 : 1);
        if (!is_vertical) {
          const d_x = d.x; d.x = d.y; d.y = d_x;
        }
      });
    }
  
    function setupSpouses({tree, node_separation}) {
      for (let i = tree.length; i--;) {
        const d = tree[i];
        if (!d.is_ancestry && d.data.rels.spouses && d.data.rels.spouses.length > 0){
          const side = d.data.data.gender === "M" ? -1 : 1;  // female on right
          d.x += d.data.rels.spouses.length/2*node_separation*side;
          d.data.rels.spouses.forEach((sp_id, i) => {
            const spouse = {data: data_stash.find(d0 => d0.id === sp_id), added: true};
  
            spouse.x = d.x-(node_separation*(i+1))*side;
            spouse.y = d.y;
            spouse.sx = i > 0 ? spouse.x : spouse.x + (node_separation/2)*side;
            spouse.spouse = d;
            if (!d.spouses) d.spouses = [];
            d.spouses.push(spouse);
            tree.push(spouse);
          });
        }
        if (d.parents && d.parents.length === 2) {
          const p1 = d.parents[0],
            p2 = d.parents[1],
            midd = p1.x - (p1.x - p2.x)/2,
            x = (d,sp) => midd + (node_separation/2)*(d.x < sp.x ? 1 : -1);
  
          p2.x = x(p1, p2); p1.x = x(p2, p1);
        }
      }
    }
  
    function setupChildrenAndParents({tree}) {
      tree.forEach(d0 => {
        delete d0.children;
        tree.forEach(d1 => {
          if (d1.parent === d0) {
            if (d1.is_ancestry) {
              if (!d0.parents) d0.parents = [];
              d0.parents.push(d1);
            } else {
              if (!d0.children) d0.children = [];
              d0.children.push(d1);
            }
          }
        });
      });
    }
  
    function calculateTreeDim(tree, node_separation, level_separation, is_vertical) {
      if (!is_vertical) [node_separation, level_separation] = [level_separation, node_separation];
      const w_extent = d3.extent(tree, d => d.x),
        h_extent = d3.extent(tree, d => d.y);
      return {
        width: w_extent[1] - w_extent[0]+node_separation, height: h_extent[1] - h_extent[0]+level_separation, x_off: -w_extent[0]+node_separation/2, y_off: -h_extent[0]+level_separation/2
      }
    }
  
    function createRelsToAdd(data) {
      const to_add_spouses = [];
      for (let i = 0; i < data.length; i++) {
        const d = data[i];
        if (d.rels.children && d.rels.children.length > 0) {
          if (!d.rels.spouses) d.rels.spouses = [];
          const is_father = d.data.gender === "M";
          let spouse;
  
          d.rels.children.forEach(d0 => {
            const child = data.find(d1 => d1.id === d0);
            if (child.rels[is_father ? 'father' : 'mother'] !== d.id) return
            if (child.rels[!is_father ? 'father' : 'mother']) return
            if (!spouse) {
              spouse = createToAddSpouse(d);
              d.rels.spouses.push(spouse.id);
            }
            spouse.rels.children.push(child.id);
            child.rels[!is_father ? 'father' : 'mother'] = spouse.id;
          });
        }
      }
      to_add_spouses.forEach(d => data.push(d));
      return data
  
      function createToAddSpouse(d) {
        const spouse = {id: Math.random() + "", rels: {spouses: [d.id], children: []},
          data: {gender: d.data.gender === "M" ? "F" : "M"}, to_add: true};
        to_add_spouses.push(spouse);
        return spouse
      }
    }
  
  }
  
  function setupSvg(svg) {
    setupZoom();
  
    function setupZoom() {
      if (svg.__zoom) return
      const view = svg.querySelector('.view'),
        zoom = d3.zoom().on("zoom", zoomed);
  
      d3.select(svg).call(zoom);
      svg.__zoomObj = zoom;
  
      function zoomed(e) {
        d3.select(view).attr("transform", e.transform);
      }
    }
  }
  
  function positionTree({t, svg, transition_time=2000}) {
    const zoom = svg.__zoomObj;
  
    // d3.select(svg).call(zoom.transform, d3.zoomIdentity.translate(x*k, y*k))
  
    d3.select(svg).transition().duration(transition_time || 0).delay(transition_time ? 100 : 0)  // delay 100 because of weird error of undefined something in d3 zoom
      .call(zoom.transform, d3.zoomIdentity.scale(t.k).translate(t.x, t.y));
  }
  
  function treeFit({svg, svg_dim, tree_dim, with_transition}) {
    const t = calculateTreeFit(svg_dim, tree_dim);
    positionTree({t, svg, with_transition});
  }
  
  function calculateTreeFit(svg_dim, tree_dim) {
    let k = Math.min(svg_dim.width / tree_dim.width, svg_dim.height / tree_dim.height),
      x = tree_dim.x_off + (svg_dim.width - tree_dim.width*k)/k/2,
      y = tree_dim.y_off + (svg_dim.height - tree_dim.height*k)/k/2;
  
    if (k>1) {x*=k;y*=k;k=1;}
    return {k,x,y}
  }
  
  function mainToMiddle({datum, svg, svg_dim, transition_time}) {
    const t = {k:1, x:svg_dim.width/2-datum.x, y: svg_dim.height/2-datum.y};
    positionTree({t, svg, with_transition: true, transition_time});
  }
  
  function createPath(d, is_) {
    const line = d3.line().curve(d3.curveMonotoneY),
      lineCurve = d3.line().curve(d3.curveBasis),
      path_data = is_ ? d._d() : d.d;
  
    if (!d.curve) return line(path_data)
    else if (d.curve === true) return lineCurve(path_data)
  }
  
  function createLinks({d, tree, is_vertical}) {
    const links = [];
  
    if (d.data.rels.spouses && d.data.rels.spouses.length > 0) handleSpouse({d});
    handleAncestrySide({d});
    handleProgenySide({d});
  
    return links;
  
    function handleAncestrySide({d}) {
      if (!d.parents || d.parents.length === 0) return
      const p1 = d.parents[0], p2 = d.parents[1];
  
      const p = {x: getMid(p1, p2, 'x'), y: getMid(p1, p2, 'y')};
  
      links.push({
        d: Link(d, p),
        _d: () => {
          const _d = {x: _or(d, 'x'), y: _or(d, 'y')},
            _p = {x: getMid(p1, p2, 'x', true), y: getMid(p1, p2, 'y', true)};
          return Link(_d, _p)
        },
        curve: true, id: linkId(d, d.parents[0], d.parents[1])
      });
    }
  
  
    function handleProgenySide({d}) {
      if (!d.children || d.children.length === 0) return
  
      d.children.forEach((child, i) => {
        const other_parent = otherParent(child, d, tree),
          sx = other_parent.sx;
  
        links.push({
          d: Link(child, {x: sx, y: d.y}),
          _d: () => Link({x: _or(child, 'x'), y: _or(child, 'y')}, {x: _or(d, 'x'), y: _or(d, 'y')}),
          curve: true, id: linkId(child, d, other_parent)
        });
      });
    }
  
  
    function handleSpouse({d}) {
      d.data.rels.spouses.forEach(sp_id => {
        const spouse = tree.find(d0 => d0.data.id === sp_id);
        if (!spouse) return
        links.push({
          d: [[d.x, d.y], [getMid(d, spouse, 'x', false), spouse.y]],
          _d: () => [
            [_or(d, 'x')-.0001, _or(d, 'y')], // add -.0001 to line to have some length if d.x === spouse.x
            [getMid(d, spouse, 'x', true), _or(spouse, 'y')]
          ],
          curve: false, id: [d.data.id, spouse.data.id].join(", ")
        });
      });
    }
  
    ///
    function getMid(d1, d2, side, is_) {
      if (is_) return _or(d1, side) - (_or(d1, side) - _or(d2, side))/2
      else return d1[side] - (d1[side] - d2[side])/2
    }
  
    function _or(d, k) {
     return d.hasOwnProperty('_'+k) ? d['_'+k] : d[k]
    }
  
    function Link(d, p) {
      const hy = (d.y + (p.y - d.y) / 2);
      return [
        [d.x, d.y],
        [d.x, hy],
        [d.x, hy],
        [p.x, hy],
        [p.x, hy],
        [p.x, p.y],
      ]
    }
  
    function linkId(...args) {
      return args.map(d => d.data.id).sort().join(", ")  // make unique id
    }
  
    function otherParent(d, p1, data) {
      return data.find(d0 => (d0.data.id !== p1.data.id) && ((d0.data.id === d.data.rels.mother) || (d0.data.id === d.data.rels.father)))
    }
  }
  
  function CardBody({d,card_dim,card_display}) {
    const color_class = d.data.data.gender === 'M' ? 'card-male card' : d.data.data.gender === 'F' ? 'card-female card' : 'card-genderless card';
    return {template: (`
      <g>
        <rect width="${card_dim.w}" height="${card_dim.h}" rx="5" ry="5" class="${color_class}${d.data.main ? ' card-main' : ''}"
          fill="url(#male_gradient)"
        />
        <g transform="translate(${card_dim.text_x}, ${card_dim.text_y})">
          <text clip-path="url(#card_text_clip)">
            <tspan x="${0}" dy="${14}">${card_display[0](d.data)}</tspan>
            <tspan x="${0}" dy="${14}" font-size="10">${card_display[1](d.data)}</tspan>
            <tspan x="${0}" dy="${14}" font-size="10">${card_display[2](d.data)}</tspan>
          </text>
          <rect width="${card_dim.w-card_dim.text_x-10}" height="${card_dim.h-20}" style="mask: url(#fade)" class="${color_class}" /> 
        </g>
      </g>
    `)
    }
  }
  
  function CardBodyAddNew({d,card_dim, show_edit}) {
    return {template: (`
      <g class="${show_edit ? 'card_edit' : ''}" style="cursor: ${show_edit ? 'pointer' : null}">
        <rect width="${card_dim.w}" height="${card_dim.h}" fill="rgb(59, 85, 96)" stroke="#fff" rx="${10}" />
        <text transform="translate(${card_dim.w/2}, ${card_dim.h/2})" text-anchor="middle" style="fill: #fff">
          <tspan font-size="18" dy="${8}">UNKNOWN</tspan>
        </text>
      </g>
    `)
    }
  }
  
  function PencilIcon({d,card_dim}) {
    return ({template: (`
      <g transform="translate(${card_dim.w-20},${card_dim.h-20})scale(.7)" style="cursor: pointer" class="card_edit pencil_icon">
        <circle fill="rgba(0,0,0,0)" r="16" cx="8" cy="8" />
        <path fill="currentColor"
           d="M19.082,2.123L17.749,0.79c-1.052-1.052-2.766-1.054-3.819,0L1.925,12.794c-0.06,0.06-0.104,0.135-0.127,0.216
            l-1.778,6.224c-0.05,0.175-0.001,0.363,0.127,0.491c0.095,0.095,0.223,0.146,0.354,0.146c0.046,0,0.092-0.006,0.137-0.02
            l6.224-1.778c0.082-0.023,0.156-0.066,0.216-0.127L19.082,5.942C20.134,4.89,20.134,3.176,19.082,2.123z M3.076,13.057l9.428-9.428
            l3.738,3.739l-9.428,9.428L3.076,13.057z M2.566,13.961l3.345,3.344l-4.683,1.339L2.566,13.961z M18.375,5.235L16.95,6.66
            l-3.738-3.739l1.425-1.425c0.664-0.663,1.741-0.664,2.405,0l1.333,1.333C19.038,3.493,19.038,4.572,18.375,5.235z"/>
      </g>
    `)})
  }
  
  function MiniTree({d,card_dim}) {
    return ({template: (`
      <g class="card_family_tree">
        <g transform="translate(${card_dim.w*.8},6)scale(.9)" style="cursor: pointer">
          <rect x="-31" y="-25" width="72" height="15" fill="rgba(0,0,0,0)"></rect>
          <line y2="-17.5" stroke="#fff" />
          <line x1="-20" x2="20" y1="-17.5" y2="-17.5" stroke="#fff" />
          <rect x="-31" y="-25" width="25" height="15" rx="5" ry="5" class="card-male" />
          <rect x="6" y="-25" width="25" height="15" rx="5" ry="5" class="card-female" />
        </g>
      </g>
    `)})
  }
  
  function PlusIcon({d,card_dim}) {
    return ({template: (`
      <g class="card_add_relative">
        <g transform="translate(${card_dim.w/2},${card_dim.h})scale(.1)">
          <circle r="100" />
          <g transform="translate(-50,-45)">
            <line
              x1="10" x2="90" y1="50" y2="50"
              stroke="currentColor" stroke-width="20" stroke-linecap="round"
            />
            <line
              x1="50" x2="50" y1="10" y2="90"
              stroke="currentColor" stroke-width="20" stroke-linecap="round"
            />
          </g>
        </g>
      </g>
    `)})
  }
  
  
  function LinkBreakIcon({x,y,rt,closed}) {
    return ({template: (`
      <g style="
            transform: translate(-12.2px, -.5px);
            cursor: pointer;
          " 
          fill="currentColor" class="card_break_link${closed ? ' closed' : ''}"
        >
        <g style="transform: translate(${x}px,${y}px)scale(.02)rotate(${rt+'deg'})">
          <rect width="1000" height="700" y="150" style="opacity: 0" />
          <g class="link_upper">
            <g>
              <path d="M616.3,426.4c19,4.5,38.1-7.4,42.6-26.4c4.4-19-7.4-38-26.5-42.5L522.5,332c-18,11.1-53.9,33.4-53.9,33.4l80.4,18.6c-7.8,4.9-19.5,12.1-31.3,19.4L616.3,426.4L616.3,426.4z"/>
              <path d="M727.4,244.2c-50.2-11.6-100.3,3.3-135.7,35.4c28.6,22.6,64.5,30.2,116.4,51.3l141,32.6c23.9,5.6,56.6,47.2,51.1,71l-4.1,17c-5.6,23.7-47.3,56.4-71.2,51l-143.4-33.2c-66.8-8.6-104.1-16.6-132.9-7.5c17.4,44.9,55.9,80.8,106.5,92.4L800.9,588c81.3,18.8,162.3-31.5,181.2-112.4l4-17c18.8-81.1-31.7-161.8-112.9-180.6L727.4,244.2z"/>
            </g>
          </g>
          <g class="link_lower">
            <path d="M421.2,384.9l-128,127.6c-13.9,13.8-13.9,36.2,0,50s36.3,13.8,50.2,0.1l136.2-135.8v-36.7l-58.4,58.1V384.9L421.2,384.9z"/>
            <path d="M204.6,742.8c-17.4,17.3-63.3,17.2-80.6,0.1l-12.3-12.3c-17.3-17.3,0.6-81.2,17.9-98.5l100.2-99.9c12.5-14.9,45.8-40.8,66.1-103.7c-47.7-9.4-98.9,4.2-135.8,40.9L54.2,575c-58.9,58.8-58.9,154,0,212.8L66.6,800c58.9,58.8,154.5,58.8,213.4,0l105.8-105.6c38.4-38.3,51.3-91.9,39.7-141c-44,22.7-89,62.3-116,84.8L204.6,742.8z"/>
          </g>
          <g class="link_particles">
            <path d="M351.9,248.4l-26.5,63.4l80.6,30.1L351.9,248.4z"/>
            <path d="M529.3,208l-43,26.6l35.4,52.3L529.3,208z"/>
            <path d="M426.6,158.8l-44-2.9l61.7,134.6L426.6,158.8z"/>
          </g>
        </g>
      </g>
    `)})
  }
  
  function CardImage({d,card_dim}) {
    return ({template: (`
      <g style="transform: translate(${card_dim.img_x}px,${card_dim.img_y}px);" class="card_image">
        ${d.data.data.image 
          ? `<image href="${d.data.data.image}" height="${card_dim.img_h}" width="${card_dim.img_w}" preserveAspectRatio="xMidYMin slice" clip-path="url(#card_image_clip)" />`
          : d.data.data.gender === "F" ? GenderlessIcon() : d.data.data.gender === "M" ? GenderlessIcon() : GenderlessIcon()}      
      </g>
    `)})
  
    function GenderlessIcon() {
      return (`
        <g>
          <rect height="${card_dim.img_h}" width="${card_dim.img_w}" clip-path="url(#card_image_clip)" fill="rgb(59, 85, 96)" />
          <path style="transform: translate(5px,5px)scale(.097)" fill="lightgrey" d="M256 288c79.5 0 144-64.5 144-144S335.5 0 256 0 112 
            64.5 112 144s64.5 144 144 144zm128 32h-55.1c-22.2 10.2-46.9 16-72.9 16s-50.6-5.8-72.9-16H128C57.3 320 0 377.3 
            0 448v16c0 26.5 21.5 48 48 48h416c26.5 0 48-21.5 48-48v-16c0-70.7-57.3-128-128-128z" />
        </g>
      `)
    }
  }
  
  function Card({d, card_display, card_dim, show_mini_tree, show_add, show_edit, show_hide_rels}) {
    return {template: (
      `
      <g class="card" data-id="POTATO">
        <g transform="translate(${-card_dim.w / 2}, ${-card_dim.h / 2})">
          ${!d.data.to_add && show_mini_tree ? MiniTree({d,card_dim}).template : ''}
          ${!d.data.to_add ? CardBody({d,card_dim, card_display}).template : CardBodyAddNew({d,card_dim, show_edit}).template}
          ${!d.data.to_add && show_add ? PlusIcon({d,card_dim}).template : ''}
          ${!d.data.to_add && show_edit ? PencilIcon({d,card_dim}).template : ''}
          ${!d.data.to_add ? CardImage({d,card_dim}).template : ''}
          ${show_hide_rels ? LinkBreakIconWrapper({d,card_dim}) : ''}
        </g>
      </g>
    `)}
  }
  
  function LinkBreakIconWrapper({d,card_dim}) {
    let g = "",
      r = d.data.rels, _r = d.data._rels || {},
      closed = d.data.hide_rels,
      areParents = r => r.father || r.mother,
      areChildren = r => r.children && r.children.length > 0;
    if ((d.is_ancestry || d.data.main) && (areParents(r) || areParents(_r))) {g+=LinkBreakIcon({x:card_dim.w/2,y:0, rt: -45, closed}).template;}
    if (!d.is_ancestry && d.added) {
      const sp = d.spouse, sp_r = sp.data.rels, _sp_r = sp.data._rels || {};
      if ((areChildren(r) || areChildren(_r)) && (areChildren(sp_r) || areChildren(_sp_r))) {
        g+=LinkBreakIcon({x:d.sx - d.x + card_dim.w/2 +24.4,y: (d.x !== d.sx ? card_dim.h/2 : card_dim.h)+1, rt: 135, closed}).template;
      }
    }
    return g
  }
  
  function Form({datum, rel_datum, data_stash, rel_type, card_edit, postSubmit, card_display}) {
    const modal_el = document.querySelector('#form_modal'),
      modal = M.Modal.getInstance(modal_el);
  
    setupFromHtml();
    modal.open();
  
    function setupFromHtml() {
      modal_el.innerHTML = (`
        <div class="modal-content">
          <form>
            <label><input type="radio" name="gender" value="M" ${datum.data.gender === 'M' ? 'checked' : ''}><span>male</span></label><br>
            <label><input type="radio" name="gender" value="F" ${datum.data.gender === 'F' ? 'checked' : ''}><span>female</span></label><br>
            ${getEditFields(card_edit)}
            ${(rel_type === "son" || rel_type === "daughter") ? otherParentSelect() : ''}
            <br><br>
            <div style="text-align: right; display: ${datum.to_add || !!rel_datum ? 'none' : 'block'}">
              <span class="btn delete">delete</span>
            </div>
            <button type="submit" class="btn">submit</button>
          </form>
        </div>
      `);
      modal_el.querySelector("form").addEventListener('submit', submitFormChanges);
      modal_el.querySelector(".btn.delete").addEventListener('click', deletePerson);
      M.FormSelect.init(modal_el.querySelectorAll("select"));
    }
  
    function otherParentSelect() {
      return (`
        <div class="input-field">
          <select name="other_parent">
            ${(!rel_datum.rels.spouses || rel_datum.rels.spouses.length === 0) 
                ? '' 
                : rel_datum.rels.spouses.map((sp_id, i) => {
                    const spouse = data_stash.find(d => d.id === sp_id);
                    return (`<option value="${sp_id}" ${i === 0 ? 'selected' : ''}>${card_display[0](spouse)}</option>`)
                  }).join("\n")}
            <option value="${'_new'}">NEW</option>
          </select>
          <label>Select other parent</label>
        </div>
      `)
    }
  
    function submitFormChanges(e) {
      e.preventDefault();
      const form_data = new FormData(e.target);
      form_data.forEach((v, k) => datum.data[k] = v);
  
      modal.close();
      postSubmit();
    }
  
    function deletePerson() {
      modal.close();
      postSubmit({delete: true});
    }
  
    function getEditFields(card_edit) {
      return card_edit.map(d => (
        d.type === 'text'
          ? `<input type="text" name="${d.key}" placeholder="${d.placeholder}" value="${datum.data[d.key] || ''}">`
          : d.type === 'textarea'
          ? `<textarea class="materialize-textarea" name="${d.key}" placeholder="${d.placeholder}">${datum.data[d.key] || ''}</textarea>`
          : ''
      )).join('\n')
    }
  }
  
  function moveToAddToAdded(datum, data_stash) {
    delete datum.to_add;
    return datum
  }
  
  function removeToAdd(datum, data_stash) {
    deletePerson(datum, data_stash);
    return false
  }
  
  function deletePerson(datum, data_stash) {
    data_stash.forEach(d => {
      for (let k in d.rels) {
        if (!d.rels.hasOwnProperty(k)) continue
        if (d.rels[k] === datum.id) {
          delete d.rels[k];
        } else if (Array.isArray(d.rels[k]) && d.rels[k].includes(datum.id)) {
          d.rels[k].splice(d.rels[k].findIndex(did => did === datum.id, 1));
        }
      }
    });
    data_stash.splice(data_stash.findIndex(d => d === datum), 1);
  
    if (datum.rels.spouses) {  // if person have spouse holder we delete that as well
      datum.rels.spouses.forEach(sp_id => {
        const spouse = data_stash.find(d => d.id === sp_id);
        if (spouse.to_add) deletePerson(spouse, data_stash);
      });
    }
  }
  
  var handlers = /*#__PURE__*/Object.freeze({
  __proto__: null,
  moveToAddToAdded: moveToAddToAdded,
  removeToAdd: removeToAdd,
  deletePerson: deletePerson
  });
  
  function CalculateTree$1({datum, data_stash, card_dim}) {
    const sx = card_dim.w+40, y = card_dim.h+50;
    datum = datum ? datum : {id: "0", data: {fn: "FN", ln: "LN", gender: "M"}};
    const data = [
      {x: 0, y: 0, data: datum},
      {x: -100, y: -y, data: {rel_type: 'father', data: {fn: 'Add', ln: "father", gender: "M"}}},
      {x: 100, y: -y, data: {rel_type: 'mother', data: {fn: 'Add', ln: "mother", gender: "F"}}},
  
      {x: sx, y: 0, data: {rel_type: 'spouse', data: {fn: 'Add', ln: "spouse", gender: "F"}}},
  
      {x: -100, y: y, data: {rel_type: 'son', data: {fn: 'Add', ln: "son", gender: "M"}}},
      {x: 100, y: y, data: {rel_type: 'daughter', data: {fn: 'Add', ln: "daughter", gender: "F"}}},
    ].filter(d => shouldAddRel(d.data.rel_type));
  
    function shouldAddRel(rel_type) {
      if (rel_type === 'father') return !datum.rels.father || data_stash.find(d => d.id === datum.rels.father).to_add
      else if (rel_type === 'mother') return !datum.rels.mother || data_stash.find(d => d.id === datum.rels.mother).to_add
      else return true
    }
  
    return {data}
  }
  
  function NewRelative({datum, data_stash, rel_type}) {
    const new_rel = createNewRel(rel_type);
    return {new_rel, addNewRel}
  
    function createNewRel(rel_type) {
      const new_rel_gender = (["daughter", "mother"].includes(rel_type) || rel_type === "spouse" && datum.data.gender === "M") ? "F" : "M";
      return {id: Math.random()+"", data: {gender: new_rel_gender}, rels: {}}
    }
  
    function addNewRel() {
      if (rel_type === "daughter") addChild(new_rel);
      else if (rel_type === "son") addChild(new_rel);
      else if (rel_type === "father") addParent(new_rel);
      else if (rel_type === "mother") addParent(new_rel);
      else if (rel_type === "spouse") addSpouse(new_rel);
    }
  
    function addChild(new_rel) {
      if (new_rel.data.other_parent) {
        addChildToSpouseAndParentToChild(new_rel.data.other_parent);
        delete new_rel.data.other_parent;
      }
      new_rel.rels[datum.data.gender === 'M' ? 'father' : 'mother'] = datum.id;
      if (!datum.rels.children) datum.rels.children = [];
      datum.rels.children.push(new_rel.id);
      data_stash.push(new_rel);
      return new_rel
  
      function addChildToSpouseAndParentToChild(spouse_id) {
        if (spouse_id === "_new") spouse_id = addOtherParent().id;
  
        const spouse = data_stash.find(d => d.id === spouse_id);
        new_rel.rels[spouse.data.gender === 'M' ? 'father' : 'mother'] = spouse.id;
        if (!spouse.rels.hasOwnProperty('children')) spouse.rels.children = [];
        spouse.rels.children.push(new_rel.id);
  
        function addOtherParent() {
          const new_spouse = createNewRel("spouse");
          addSpouse(new_spouse);
          return new_spouse
        }
      }
    }
  
    function addParent(new_rel) {
      const is_father = new_rel.data.gender === "M",
        parent_to_add_id = datum.rels[is_father ? 'father' : 'mother'];
      if (parent_to_add_id) removeToAdd(data_stash.find(d => d.id === parent_to_add_id), data_stash);
      addNewParent();
  
      function addNewParent() {
        datum.rels[is_father ? 'father' : 'mother'] = new_rel.id;
        data_stash.push(new_rel);
        handleSpouse();
        new_rel.rels.children = [datum.id];
        return new_rel
  
        function handleSpouse() {
          const spouse_id = datum.rels[!is_father ? 'father' : 'mother'];
          if (!spouse_id) return
          const spouse = data_stash.find(d => d.id === spouse_id);
          new_rel.rels.spouses = [spouse_id];
          if (!spouse.rels.spouses) spouse.rels.spouses = [];
          spouse.rels.spouses.push(new_rel.id);
          return spouse
        }
      }
    }
  
    function addSpouse(new_rel) {
      removeIfToAdd();
      if (!datum.rels.spouses) datum.rels.spouses = [];
      datum.rels.spouses.push(new_rel.id);
      new_rel.rels.spouses = [datum.id];
      data_stash.push(new_rel);
  
      function removeIfToAdd() {
        if (!datum.rels.spouses) return
        datum.rels.spouses.forEach(spouse_id => {
          const spouse = data_stash.find(d => d.id === spouse_id);
          if (spouse.to_add) removeToAdd(spouse, data_stash);
        });
      }
    }
  
  }
  
  function View(store, tree, datum) {
    const data_stash = store.getData(),
      svg_dim = store.state.cont.getBoundingClientRect(),
      tree_fit = calculateTreeFit(svg_dim),
      mounted = (node) => {
        addEventListeners(node);
      };
  
    return {
      template: (`
        <svg id="family-tree-svg" style="width: 100%; height: 100%">
          <rect width="${svg_dim.width}" height="${svg_dim.height}" fill="transparent" />
          <g class="view">
            <g transform="translate(${tree_fit.x}, ${tree_fit.y})scale(${tree_fit.k})">
              ${tree.data.slice(1).map((d, i) => Link({d, is_vertical: !["spouse"].includes(d.data.rel_type)}).template)}
              ${tree.data.slice(1).map((d, i) => Card({d}).template)}
            </g>
          </g>
        </svg>
      `),
      mounted
    }
  
    function calculateTreeFit(svg_dim) {
      return {k:1, x:svg_dim.width/2, y: svg_dim.height/2}
    }
  
    function Card({d, is_main}) {
      const [w, h] = is_main ? [160, 60] : [160, 40],
        pos = {x: d.x, y: d.y};
  
      return {template: (`
        <g transform="translate(${pos.x}, ${pos.y})" class="card" data-rel_type="${d.data.rel_type}" style="cursor: pointer">
          <g transform="translate(${-w / 2}, ${-h / 2})">
            ${CardBody({d,w,h}).template}
          </g>
        </g>
      `)
      }
  
      function CardBody({d,w,h}) {
        const color_class = d.data.data.gender === 'M' ? 'card-male' : d.data.data.gender === 'F' ? 'card-female' : 'card-genderless';
        return {template: (`
          <g>
            <rect width="${w}" height="${h}" fill="#fff" rx="${10}" ${d.data.main ? 'stroke="#000"' : ''} class="${color_class}" />
            <text transform="translate(${0}, ${h / 4})">
              <tspan x="${10}" dy="${14}">${d.data.data.fn} ${d.data.data.ln || ''}</tspan>
              <tspan x="${10}" dy="${14}">${d.data.data.bd || ''}</tspan>
            </text>
          </g>
        `)
        }
      }
    }
  
    function Link({d, is_vertical}) {
      return {template: (`
        <path d="${createPath()}" fill="none" stroke="#fff" />
      `)}
  
      function createPath() {
        const {w,h} = store.state.card_dim;
        let parent = (is_vertical && d.y < 0)
          ? {x: 0, y: -h/2}
          : (is_vertical && d.y > 0)
          ? {x: 0, y: h/2}
          : (!is_vertical && d.x < 0)
          ? {x: -w/2, y: 0}
          : (!is_vertical && d.x > 0)
          ? {x: w/2, y: 0}
          : {x: 0, y: 0};
  
  
        if (is_vertical) {
          return (
            "M" + d.x + "," + d.y
            + "C" + (d.x) + "," + (d.y + (d.y < 0 ? 50 : -50))
            + " " + (parent.x) + "," + (parent.y + (d.y < 0 ? -50 : 50))
            + " " + parent.x + "," + parent.y
          )
        } else {
          const s = d.x > 0 ? +1 : -1;
          return (
            "M" + d.x + "," + d.y
            + "C" + (parent.x + 50*s) + "," + d.y
            + " " + (parent.x + 150*s) + "," + parent.y
            + " " + parent.x + "," + parent.y
          )
        }
      }
    }
  
    function addEventListeners(view) {
      view.addEventListener("click", e => {
        const node = e.target;
        handleCardClick(node) || view.remove();
      });
  
      function handleCardClick(node) {
        if (!node.closest('.card')) return
        const card = node.closest('.card'),
          rel_type = card.getAttribute("data-rel_type"),
          {new_rel, addNewRel} = NewRelative({datum, data_stash, rel_type}),
          postSubmit = () => {
            view.remove();
            addNewRel();
            store.update.tree();
          };
        Form({datum: new_rel, rel_datum: datum, data_stash, rel_type,
          postSubmit, card_edit: store.state.card_edit, card_display: store.state.card_display});
        return true
      }
    }
  
  }
  
  function AddRelativeTree(store, d_id, transition_time) {
    const datum = store.getData().find(d => d.id === d_id),
      tree = CalculateTree$1({datum, data_stash: store.getData(), card_dim: store.state.card_dim}),
      view = View(store, tree, datum);
  
    const div_add_relative = document.createElement("div");
    div_add_relative.style.cssText = "width: 100%; height: 100%; position: absolute; top: 0; left: 0;background-color: rgba(0,0,0,.3);opacity: 0";
    div_add_relative.innerHTML = view.template;
  
    store.state.cont.appendChild(div_add_relative);
    view.mounted(div_add_relative);
    d3.select(div_add_relative).transition().duration(transition_time).delay(transition_time/4).style("opacity", 1);
  }
  
  function ViewAddEventListeners(store) {
    store.state.cont.querySelector(".main_svg").addEventListener("click", e => {
      const node = e.target;
      console.log(node);
      handleCardFamilyTreeClickMaybe(node) || handleCardEditClickMaybe(node)
      || handleCardAddRelative(node) || handleCardShowHideRels(node) || redirectToTreeMemberPage(node);
    });
  
    function redirectToTreeMemberPage(node) {
      const card = node.closest('.card');
      console.log('card', card);
      d_id = card.getAttribute("data-id");
      console.log('id', d_id);
      datum = store.getData().find(d => d.id === d_id);
      console.log(datum);
    }
  
    function handleCardFamilyTreeClickMaybe(node) {
      if (!node.closest('.card_family_tree')) return
      const card = node.closest('.card'),
        d_id = card.getAttribute("data-id");
  
      toggleAllRels(store.getTree().data, false);
      store.update.mainId(d_id);
      store.update.tree({tree_position: 'inherit'});
      return true
    }
  
    function handleCardEditClickMaybe(node) {
      if (!node.closest('.card_edit')) return
      const card = node.closest('.card'),
        d_id = card.getAttribute("data-id"),
        datum = store.getData().find(d => d.id === d_id),
        postSubmit = (props) => {
          if (datum.to_add) moveToAddToAdded(datum, store.getData());
          if (props && props.delete) {
            if (datum.main) store.update.mainId(null);
            deletePerson(datum, store.getData());
          }
          store.update.tree();
        };
      Form({datum, postSubmit, card_edit: store.state.card_edit, card_display: store.state.card_display});
      return true
    }
  
    function handleCardAddRelative(node) {
      if (!node.closest('.card_add_relative')) return
      const card = node.closest('.card'),
        d_id = card.getAttribute("data-id"),
        transition_time = 1000;
  
      toggleAllRels(store.getTree().data, false);
      store.update.mainId(d_id);
      store.update.tree({tree_position: 'main_to_middle', transition_time});
      AddRelativeTree(store, d_id, transition_time);
      return true
    }
  
    function handleCardShowHideRels(node) {
      if (!node.closest('.card_break_link')) return
      const card = node.closest('.card'),
        d_id = card.getAttribute("data-id"),
        tree_datum = store.getTree().data.find(d => d.data.id === d_id);
  
      tree_datum.data.hide_rels = !tree_datum.data.hide_rels;
      toggleRels(tree_datum, tree_datum.data.hide_rels);
      store.update.tree({tree_position: 'inherit'});
      return true
    }
  
  }
  
  function d3AnimationView(store) {
    const svg = createSvg();
    setupSvg(svg);
    setEventListeners();
  
    return {update: updateView}
  
    function updateView({tree_position='fit', transition_time=2000}) {
      const tree = store.state.tree,
        view = d3.select(svg).select(".view");
  
      updateCards();
      updateLinks();
      if (tree_position === 'fit') treeFit({svg, svg_dim: svg.getBoundingClientRect(), tree_dim: tree.dim, transition_time});
      else if (tree_position === 'main_to_middle') mainToMiddle({datum: tree.data[0], svg, svg_dim: svg.getBoundingClientRect(), transition_time});
      else ;
  
      function updateLinks() {
        const links_data = tree.data.reduce((acc, d) => acc.concat(createLinks({d, tree:tree.data})), []),
          link = view.select(".links_view").selectAll("path.link").data(links_data, d => d.id),
          link_exit = link.exit(),
          link_enter = link.enter().append("path").attr("class", "link"),
          link_update = link_enter.merge(link);
  
        link_exit.each(linkExit);
        link_enter.each(linkEnter);
        link_update.each(linkUpdate);
  
        function linkEnter(d) {
          d3.select(this).attr("fill", "none").attr("stroke", "#fff").style("opacity", 0)
            .attr("d", createPath(d, true));
        }
  
        function linkUpdate(d) {
          const path = d3.select(this);
          path.transition('path').duration(transition_time).attr("d", createPath(d)).style("opacity", 1);
        }
  
        function linkExit(d) {
          const path = d3.select(this);
          path.transition('op').duration(800).style("opacity", 0);
          path.transition('path').duration(transition_time).attr("d", createPath(d, true))
            .on("end", () => path.remove());
        }
  
      }
  
      function updateCards() {
        const card = view.select(".cards_view").selectAll("g.card_cont").data(tree.data, d => d.data.id),
          card_exit = card.exit(),
          card_enter = card.enter().append("g").attr("class", "card_cont"),
          card_update = card_enter.merge(card);
  
        card_exit.each(d => calculateEnterAndExitPositions(d, false, true));
        card_enter.each(d => calculateEnterAndExitPositions(d, true, false));
  
        card_exit.each(cardExit);
        card.each(cardUpdateNoEnter);
        card_enter.each(cardEnter);
        card_update.each(cardUpdate);
  
        function cardEnter(d) {
          d3.select(this)
            .attr("transform", `translate(${d._x}, ${d._y})`)
            .style("opacity", 0)
            .html(CardHtml(d));
        }
  
        function cardUpdateNoEnter(d) {}
  
        function cardUpdate(d) {
          d3.select(this).html(CardHtml(d));
          d3.select(this).transition().duration(transition_time).attr("transform", `translate(${d.x}, ${d.y})`).style("opacity", 1);
        }
  
        function cardExit(d) {
          const g = d3.select(this);
          g.transition().duration(transition_time).style("opacity", 0).attr("transform", `translate(${d._x}, ${d._y})`)
            .on("end", () => g.remove());
        }
  
        function CardHtml(d) {
          const show_mini_tree = store.state.mini_tree && !isAllRelativeDisplayed(d, tree.data);
          return Card({
            d,
            card_display: store.state.card_display,
            card_dim: store.state.card_dim,
            show_mini_tree: show_mini_tree,
            show_edit: store.state.edit,
            show_add: store.state.add,
            show_hide_rels: store.state.hide_rels
          }).template
        }
      }
  
    }
  
    function createSvg() {
      const svg_dim = store.state.cont.getBoundingClientRect(),
        card_dim = store.state.card_dim,
        svg_html = (`
          <svg class="main_svg">
            <defs>
              <linearGradient id="fadeGrad">
                <stop offset="0.9" stop-color="white" stop-opacity="0"/>
                <stop offset=".91" stop-color="white" stop-opacity=".5"/>
                <stop offset="1" stop-color="white" stop-opacity="1"/>
              </linearGradient>
          
              <mask id="fade" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="url(#fadeGrad)"/></mask>
              <clipPath id="card_text_clip"><rect width="${card_dim.w-card_dim.text_x-10}" height="${card_dim.h-10}"></rect></clipPath>
              <clipPath id="card_image_clip"><rect width="${card_dim.img_w}" height="${card_dim.img_h}" rx="5" ry="5"></rect></clipPath>
            </defs>
            <rect width="${svg_dim.width}" height="${svg_dim.height}" fill="transparent" />
            <g class="view">
              <g class="links_view"></g>
              <g class="cards_view"></g>
            </g>
            <g style="transform: translate(100%, 100%)">
            <g class="fit_screen_icon cursor-pointer" style="transform: translate(-50px, -50px)">
              <rect width="27" height="27" stroke-dasharray="${27/2}" stroke-dashoffset="${27/4}" 
                style="stroke:#fff;stroke-width:4px;fill:transparent;"/>
              <circle r="5" cx="${27/2}" cy="${27/2}" style="fill:#fff" />          
            </g>
            </g>
          </svg>
        `);
      const fake_cont = document.createElement("div");
      fake_cont.innerHTML = svg_html;
      const svg = fake_cont.firstElementChild;
      store.state.cont.appendChild(svg);
  
      return svg
    }
  
    function setEventListeners() {
      svg.querySelector(".fit_screen_icon").addEventListener("click", () => store.update.tree());
      ViewAddEventListeners(store);
    }
  }
  
  function createStore(initial_state) {
    let onUpdate;
    const state = initial_state,
      update = {
        tree: (props) => {
          state.tree = calcTree();
          if (onUpdate) onUpdate(props);
        },
        mainId: main_id => state.main_id = main_id,
        data: data => {state.data = data; update.tree();}
      },
      getData = () => state.data,
      getTree = () => state.tree,
      setOnUpdate = (f) => onUpdate = f,
      methods = {};
  
    return {state, update, getData, getTree, setOnUpdate, methods}
  
  
    function calcTree() {
      return CalculateTree({
        data_stash: state.data, main_id: state.main_id,
        node_separation: state.node_separation, level_separation: state.level_separation
      })
    }
  }
  
  var index = {
    CalculateTree,
    createStore,
    d3AnimationView,
    handlers
  };
  
  return index;
  
  })));
  