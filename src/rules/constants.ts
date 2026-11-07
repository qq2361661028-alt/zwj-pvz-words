// §6/§7/§9 的全部数值口径集中在此；单位：秒 / 点 / 格
export const RULES = {
  tick_s: 1 / 30,                 // D18 定步长
  hand_size: 5,                   // D7
  panel_slowdown: 0.85,           // D17 打开面板僵尸系数
  penalty_disable_ms: 2000,       // §6.3 / O2
  distractor_ratio: 0.5,          // §6.2
  distractor_min: 2,
  distractor_max: 6,
  distractor_per_row: 12,         // §6.2；G3：1280 下实际每行 25 块，此值仅作防御
  hint_ladder_1: 2,               // §6.4：连错 2 次强调音标并朗读
  hint_ladder_2: 4                // §6.4：连错 4 次高亮正确块并记 assisted
} as const

export const BOARD = {
  lanes: 5,
  cols: 9,                        // §5
  spawn_x: 9.6,                   // G7：网格右缘之外、画幅之内
  house_x: 0.15,                  // 失败线
  eat_back: 0.62,                 // 僵尸嘴部窗口
  eat_front: 0.12
} as const

export const SUN = {
  start: 75,
  cap: 9990,                      // D16
  produce_amount: 25,
  produce_interval_s: 12
} as const
