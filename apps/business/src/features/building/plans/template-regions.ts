import sourceRegions from "../euro-plaza/masterplan/source-plan-regions.json";
import type { PlanPoint, PlanShape } from "./plan-model";

type Polygon = number[][];
function rectangle(x: number, y: number, width: number, height: number): Polygon {
  return [[x,y],[x+width,y],[x+width,y+height],[x,y+height]];
}
function commercial(id: string): { width: number; height: number; polygons: Polygon[] } {
  if (id === "floor-1") return { width:1774, height:887, polygons:[
    [[237,140],[545,140],[545,239],[426,239],[426,310],[237,310]],
    rectangle(650,140,106,238), rectangle(768,140,104,238),
    [[896,140],[1090,140],[1090,237],[980,237],[980,163],[896,163]],
    rectangle(1404,256,64,120),rectangle(1480,256,65,120),
    rectangle(225,519,124,183),
    ...Array.from({length:8},(_,i)=>rectangle(430+i*113,453,98,60)),
    ...Array.from({length:12},(_,i)=>rectangle(427+i*76,527,65,105)),
    [[1407,453],[1491,453],[1491,505],[1456,505],[1456,607],[1407,607]],
    rectangle(1407,619,44,79),
  ]};
  return {width:1620,height:972,polygons:[
    rectangle(219,126,63,115),rectangle(337,126,65,91),rectangle(420,160,98,94),
    rectangle(173,256,106,63),rectangle(212,340,63,61),rectangle(335,269,65,118),
    rectangle(420,340,81,47),rectangle(516,341,84,46),
    rectangle(621,127,59,196),rectangle(619,340,61,47),
    [[744,131],[828,131],[828,168],[799,168],[799,202],[830,202],[830,253],[744,253]],
    rectangle(744,272,84,115),rectangle(846,131,107,45),rectangle(973,131,56,123),
    rectangle(1055,344,79,43),rectangle(1145,344,91,43),
    rectangle(1344,127,83,33),rectangle(1299,178, 70,140),
    rectangle(1299,338,78,49),rectangle(1438,345,37,165),
    rectangle(218,460,56, 80),
    [[170,554],[272,554],[272,733],[216,733],[216,615],[170,615]],
    ...Array.from({length:9},(_,i)=>rectangle(339+i*101,473,87,47)),
    ...Array.from({length:13},(_,i)=>rectangle(337+i*70,545,58,104)),
    rectangle(1307,470,72,44),rectangle(1307,535,39,105),
    [[1307,663],[1347,663],[1347,713],[1434,713],[1434,737],[1307,737]],
  ]};
}
export function templateRegions(id: string, imageWidth: number, imageHeight: number): PlanShape[] {
  const scale = Math.min(1000/imageWidth,800/imageHeight);
  const offsetX = (1000-imageWidth*scale)/2, offsetY=(800-imageHeight*scale)/2;
  let width: number, height: number;
  let polygons: { label: string; points: Polygon }[];
  if (id === "floors-4-10" || id === "floors-11-16") {
    width=1491; height=1055;
    const p = id === "floors-11-16" ? {sx:1.304,sy:1.32,tx:-539.6,ty:-368.4} : {sx:1.228,sy:1.267,tx:-478.5,ty:-324.9};
    polygons=sourceRegions[id].flatMap(region => region.displayPath.split(/Z/i).filter(part=>part.trim()).map(part=>({
      label: region.code,
      points: Array.from(part.matchAll(/[-\d.]+,[-\d.]+/g), match => {
        const [x,y]=match[0].split(",").map(Number);
        return [x*p.sx+p.tx,y*p.sy+p.ty];
      }),
    })));
  } else {
    const plan=commercial(id); width=plan.width; height=plan.height;
    polygons=plan.polygons.map((points,index)=>({label:`Үйлчилгээ ${index+1}`,points}));
  }
  return polygons.filter(p=>p.points.length>=3).map(p=>({
    id:crypto.randomUUID(),kind:"unit",label:p.label,unitSlot:null,
    points:p.points.map(([x,y]):PlanPoint=>({x:offsetX+x/width*imageWidth*scale,y:offsetY+y/height*imageHeight*scale})),
  }));
}
