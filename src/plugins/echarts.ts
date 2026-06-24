import { use } from "echarts/core";

import { CanvasRenderer } from "echarts/renderers";
import { LineChart, BarChart, GaugeChart, ScatterChart, PieChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
} from "echarts/components";

use([
  CanvasRenderer,

  LineChart,
  BarChart,
  GaugeChart,
  ScatterChart,
  PieChart,

  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
]);
