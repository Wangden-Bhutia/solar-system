export function createLabState() {
  let value = { view:'explore', world:'Earth', experiment:null, orbit:0, tilt:23.44, latitude:40, phase:90, feature:'overview', compareA:'Earth', compareB:'Moon', mass:30, sheet:'closed', node:30, sunCm:22, journey:null, step:0, answers:{} };
  const history=[];
  const defaults = { orbit:0, tilt:23.44, latitude:40, phase:90, node:30, sunCm:22 };
  return {
    get value(){return {...value};}, get canBack(){return history.length>0;}, get previous(){return history.length?{...history[history.length-1]}:null;},
    navigate(patch){history.push({...value});value={...value,...patch};},
    update(patch){value={...value,...patch};},
    // Going back restores the view, but guesses already made stay made.
    back(){if(history.length)value={...history.pop(),answers:value.answers};return {...value};},
    reset(){value={...value,...defaults};},
  };
}
