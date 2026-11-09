export function createLabState() {
  let value = { view:'explore', world:'Earth', experiment:null, orbit:0, tilt:23.44, latitude:40, phase:90, feature:'overview', compareA:'Earth', compareB:'Moon', mass:30 };
  const history=[];
  const defaults = { orbit:0, tilt:23.44, latitude:40, phase:90 };
  return {
    get value(){return {...value};}, get canBack(){return history.length>0;},
    navigate(patch){history.push({...value});value={...value,...patch};},
    update(patch){value={...value,...patch};},
    back(){if(history.length)value=history.pop();return {...value};},
    reset(){value={...value,...defaults};},
  };
}
