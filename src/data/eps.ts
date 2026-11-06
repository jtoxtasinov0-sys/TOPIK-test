import type { Question, Test } from "@/lib/exam";

// EPS-TOPIK (고용허가제 한국어능력시험) — 1-variant. Original mashq testi, rasmiy formatga yaqin.
// 읽기 1~20 (25 daqiqa) · 듣기 21~40 (25 daqiqa) · har savol 2.5 ball · jami 100 ball.
// Mavzular: kundalik hayot, ish joyi, asboblar, ishlab chiqarishda xavfsizlik, mehnat qoidalari, Koreya madaniyati.

const PTS = 2.5;
const q = (n: number, options: string[], answer: number, extra: Partial<Question> = {}): Question => ({
  n,
  pts: PTS,
  options,
  answer,
  ...extra,
});

export const EPS: Test = {
  id: "eps-v1",
  exam: "eps",
  title: "EPS-TOPIK · 1-variant",
  sections: [
    {
      id: "reading",
      title: "읽기",
      period: 1,
      minutes: 25,
      groups: [
        {
          from: 1,
          to: 4,
          instruction: "※ [1~4] 다음 그림을 보고 맞는 단어나 문장을 고르십시오.",
          questions: [
            q(1, ["망치", "가위", "드라이버", "톱"], 1, { picture: "🔨", pictureImage: "A single claw hammer lying on a workbench, simple object drawing." }),
            q(2, ["모자", "양말", "장갑", "신발"], 3, { picture: "🧤", pictureImage: "A pair of cotton work gloves lying on a workbench, simple object drawing." }),
            q(3, ["상자를 버립니다.", "상자를 트럭에 싣습니다.", "상자를 엽니다.", "상자를 삽니다."], 2, {
              picture: "👷 📦 ➡️ 🚚",
              pictureImage: "In front of a factory, a worker wearing a safety helmet lifts a cardboard box onto the back of a small delivery truck.",
            }),
            q(4, ["운동을 합니다.", "일을 합니다.", "요리를 합니다.", "잠을 잡니다."], 4, {
              picture: "😴 🛏️ 🌙",
              pictureImage: "At night in a small dormitory room, a man is sleeping in a bed under a blanket; the moon is visible through the window.",
            }),
          ],
        },
        {
          from: 5,
          to: 7,
          instruction: "※ [5~7] 다음 빈칸에 들어갈 가장 알맞은 것을 고르십시오.",
          questions: [
            q(5, ["출근합니다", "졸업합니다", "결혼합니다", "운동합니다"], 1, {
              passage: "저는 매일 아침 8시에 회사에 (           ). 그리고 저녁 6시에 퇴근합니다.",
            }),
            q(6, ["전화하지만", "전화해서", "전화하려면", "전화하거나"], 2, {
              passage: "기계가 갑자기 멈췄습니다. 반장님께 (           ) 고장을 알렸습니다.",
            }),
            q(7, ["벗으세요", "입으세요", "신으세요", "쓰세요"], 4, {
              passage: "작업장은 위험하니까 안전모를 꼭 (           ).",
            }),
          ],
        },
        {
          from: 8,
          to: 9,
          instruction: "※ [8~9] 밑줄 친 부분과 의미가 같은 것을 고르십시오.",
          questions: [
            q(8, ["쉽습니다", "깨끗합니다", "어렵습니다", "재미있습니다"], 3, { passage: "처음에는 이 일이 <u>쉽지 않습니다</u>." }),
            q(9, ["바로", "다시", "먼저", "아까"], 1, { passage: "회의가 끝나면 <u>곧</u> 연락드리겠습니다." }),
          ],
        },
        {
          from: 10,
          to: 12,
          instruction: "※ [10~12] 다음 안전 표지가 뜻하는 것을 고르십시오.",
          questions: [
            q(10, ["금연", "출입 금지", "화기 금지", "사용 금지"], 2, { sign: { kind: "prohibit", icon: "🚶" } }),
            q(11, ["안전모 착용", "보안경 착용", "안전화 착용", "방독 마스크 착용"], 1, { sign: { kind: "order", icon: "⛑️" } }),
            q(12, ["낙하물 경고", "화재 경고", "고압 전기 경고", "미끄럼 주의"], 3, { sign: { kind: "warn", icon: "⚡" } }),
          ],
        },
        {
          from: 13,
          to: 15,
          instruction: "※ [13~15] 다음을 읽고 내용과 같은 것을 고르십시오.",
          questions: [
            q(
              13,
              ["방에서 요리를 하면 안 됩니다.", "기숙사에는 24시간 들어갈 수 있습니다.", "세탁실은 밤 11시까지 이용할 수 있습니다.", "쓰레기는 매일 버릴 수 있습니다."],
              1,
              {
                notice: {
                  style: "poster",
                  title: "기숙사 이용 안내",
                  lines: ["• 출입 시간: 06:00 ~ 23:00", "• 세탁실: 매일 19:00 ~ 22:00", "• 방에서 요리 금지", "• 쓰레기: 월·수·금요일 저녁에 버리십시오."],
                },
              }
            ),
            q(
              14,
              ["내일은 하루 종일 일합니다.", "점심을 먹지 않고 퇴근합니다.", "특근에 참석하는지 반장에게 말해야 합니다.", "일요일에 특근이 있습니다."],
              3,
              {
                notice: {
                  style: "msg",
                  title: "[한국정밀] 알림",
                  lines: [
                    "내일(토) 오전에 특근이 있습니다.",
                    "근무 시간은 8시~12시이고, 점심 식사 후에 퇴근합니다.",
                    "참석 여부를 오늘 5시까지 반장에게 알려 주십시오.",
                  ],
                },
              }
            ),
            q(
              15,
              ["연장 근로 수당은 없습니다.", "기본급은 2,156,880원입니다.", "공제 금액이 기본급보다 많습니다.", "실제로 받는 돈은 2,476,880원입니다."],
              2,
              {
                notice: {
                  style: "poster",
                  title: "2026년 10월 급여 명세서",
                  lines: ["기본급: 2,156,880원", "연장 근로 수당: 320,000원", "공제(국민연금·건강보험 등): 210,000원", "실 지급액: 2,266,880원"],
                },
              }
            ),
          ],
        },
        {
          from: 16,
          to: 18,
          instruction: "※ [16~18] 다음 글을 읽고 물음에 답하십시오.",
          questions: [
            q(
              16,
              ["반찬은 숟가락으로 먹습니다.", "어른보다 먼저 먹기 시작합니다.", "밥은 젓가락으로 먹습니다.", "어른이 수저를 든 후에 먹기 시작합니다."],
              4,
              {
                prompt: "이 글의 내용과 같은 것은 무엇입니까?",
                passage:
                  "한국에서는 식사할 때 숟가락과 젓가락을 사용합니다. 밥과 국은 숟가락으로 먹고 반찬은 젓가락으로 먹습니다. 그리고 어른과 함께 식사할 때는 어른이 먼저 수저를 든 후에 먹기 시작하는 것이 예절입니다.",
              }
            ),
            q(
              17,
              ["허리를 굽혀서 듭니다.", "물건을 몸에서 멀리 들고 갑니다.", "무거워도 혼자 듭니다.", "무릎을 굽혀서 물건을 듭니다."],
              4,
              {
                prompt: "무거운 물건을 들 때 바른 방법은 무엇입니까?",
                passage:
                  "작업장에서 무거운 물건을 들 때는 허리를 굽히지 말고 무릎을 굽혀서 들어야 합니다. 물건은 몸 가까이 붙여서 들고, 너무 무거우면 동료와 함께 들거나 운반 장비를 사용해야 합니다.",
              }
            ),
            q(
              18,
              ["외국인 근로자는 산재보험 보상을 받을 수 없습니다.", "다치면 근로복지공단에 보상을 신청할 수 있습니다.", "사업주가 보험에 가입해야만 보상을 받을 수 있습니다.", "치료는 신청이 끝난 후에 받아야 합니다."],
              2,
              {
                prompt: "이 글의 내용과 같은 것은 무엇입니까?",
                passage:
                  "외국인 근로자도 일하다가 다치면 산업재해 보상보험(산재보험)의 보상을 받을 수 있습니다. 사업주가 보험에 가입하지 않았어도 받을 수 있습니다. 다쳤을 때는 먼저 치료를 받고, 근로복지공단에 보상을 신청하면 됩니다.",
              }
            ),
          ],
        },
        {
          from: 19,
          to: 20,
          instruction: "※ [19~20] 다음 글을 읽고 물음에 답하십시오.",
          passage:
            "우리 공장에서는 매월 첫째 주 금요일에 소방 훈련을 합니다. 훈련 경보가 울리면 하던 작업을 멈추고 기계의 전원을 끈 후 가까운 비상구로 나가야 합니다. 이때 엘리베이터는 타지 말고 계단을 이용해야 합니다. 밖으로 나온 후에는 ( ㉠ ) 모여서 반장에게 인원을 확인받습니다. 훈련에 참여하지 않으면 실제로 불이 났을 때 위험할 수 있으므로 모든 직원이 꼭 참여해야 합니다.",
          questions: [
            q(19, ["기숙사에서", "정해진 장소에", "엘리베이터 앞에", "작업장 안에"], 2, { prompt: "㉠에 들어갈 알맞은 말을 고르십시오." }),
            q(
              20,
              ["소방 훈련은 매주 금요일에 합니다.", "경보가 울리면 엘리베이터를 타고 나갑니다.", "기계 전원을 끄고 비상구로 나갑니다.", "훈련은 원하는 사람만 참여합니다."],
              3,
              { prompt: "이 글의 내용과 같은 것을 고르십시오." }
            ),
          ],
        },
      ],
    },
    {
      id: "listening",
      title: "듣기",
      period: 1,
      minutes: 25,
      groups: [
        {
          from: 21,
          to: 22,
          instruction: "※ [21~22] 다음을 듣고 들은 것을 고르십시오.",
          questions: [
            q(21, ["곰장", "콩장", "공장", "공짱"], 3, { script: "공장" }),
            q(22, ["발리 오세요.", "빨리 오세요.", "팔리 오세요.", "빨이 오세요."], 2, { script: "빨리 오세요." }),
          ],
        },
        {
          from: 23,
          to: 24,
          instruction: "※ [23~24] 다음 대화를 듣고 알맞은 그림을 고르십시오.",
          questions: [
            q(23, ["👨‍🍳 🍳 🔥", "👷 📦 ➡️ 🚚", "👷 📞 💬", "🧍 🚿 🧼"], 2, {
              optionStyle: "picture",
              optionImages: [
                "In a kitchen, a male cook fries food in a pan on a gas stove.",
                "In a factory yard, a male worker wearing a safety helmet carries a cardboard box toward a small delivery truck.",
                "In a factory, a male worker wearing a safety helmet talks on a mobile phone.",
                "In a washroom, a man washes his hands with soap at a sink.",
              ],
              script: "여자: 지금 뭐 해요?\n남자: 상자를 트럭으로 옮기고 있어요.",
            }),
            q(24, ["🟢 👆 📱", "🔑 🚪 🚶", "🔧 🔩 🧰", "🔴 👆 ⚙️"], 4, {
              optionStyle: "picture",
              optionImages: [
                "A male factory worker taps the screen of a smartphone with his finger.",
                "A male worker unlocks a door with a key and walks out of a room.",
                "A male worker tightens a bolt with a wrench on a workbench, a toolbox next to him.",
                "A male factory worker presses a large round emergency stop button on a big factory machine.",
              ],
              script: "남자: 이 기계는 어떻게 멈춰요?\n여자: 이 빨간 버튼을 누르세요.",
            }),
          ],
        },
        {
          from: 25,
          to: 28,
          instruction: "※ [25~28] 다음을 듣고 이어지는 말로 알맞은 것을 고르십시오.",
          questions: [
            q(25, ["반갑습니다. 저는 알리셰르입니다.", "네, 안녕히 계세요.", "괜찮습니다.", "잘 먹겠습니다."], 1, { script: "여자: 처음 뵙겠습니다. 저는 김수진입니다." }),
            q(26, ["공장에 가요.", "버스로 가요.", "여덟 시까지 오세요.", "어제 왔어요."], 3, { script: "남자: 내일 몇 시까지 출근해야 돼요?" }),
            q(27, ["네, 지금 바로 낄게요.", "아니요, 장갑이 싸요.", "네, 장갑을 샀어요.", "아니요, 위험하지 않았어요."], 1, { script: "여자: 장갑을 안 끼면 위험해요." }),
            q(28, ["시장이 멀어요.", "아니요, 주말이었어요.", "네, 좋아요. 몇 시에 만날까요?", "시장에서 샀어요."], 3, { script: "남자: 이번 주말에 같이 시장에 갈까요?" }),
          ],
        },
        {
          from: 29,
          to: 31,
          instruction: "※ [29~31] 여기는 어디입니까? 알맞은 곳을 고르십시오.",
          questions: [
            q(29, ["은행", "병원", "식당", "미용실"], 1, { script: "남자: 우즈베키스탄에 돈을 보내고 싶어요.\n여자: 외국인 등록증하고 통장을 주세요." }),
            q(30, ["은행", "공항", "병원", "시장"], 3, { script: "여자: 어디가 아프세요?\n남자: 어제부터 목이 아프고 기침이 나요." }),
            q(31, ["서점", "약국", "세탁소", "옷 가게"], 4, { script: "남자: 이 바지 입어 봐도 돼요?\n여자: 네, 탈의실은 저쪽에 있어요." }),
          ],
        },
        {
          from: 32,
          to: 34,
          instruction: "※ [32~34] 다음 대화를 듣고 내용과 같은 것을 고르십시오.",
          questions: [
            q(32, ["남자는 오늘 야근을 합니다.", "남자는 오늘 병원에 갑니다.", "여자는 내일 병원에 갑니다.", "남자는 내일 야근을 못 합니다."], 2, {
              script: "여자: 알리 씨, 오늘 야근할 수 있어요?\n남자: 죄송해요. 오늘은 병원에 가야 해서 안 돼요. 내일은 할 수 있어요.\n여자: 그럼 내일 부탁해요.",
            }),
            q(33, ["남자는 지게차로 상자를 옮길 것입니다.", "상자는 가볍습니다.", "남자는 상자를 손으로 옮깁니다.", "여자는 창고에 있습니다."], 1, {
              script: "남자: 이 상자는 어디에 놓을까요?\n여자: 무거우니까 지게차로 창고 앞까지 옮겨 주세요.\n남자: 네, 알겠습니다.",
            }),
            q(34, ["외국인 등록증은 오늘 나옵니다.", "여자는 등록증을 받았습니다.", "신청하고 일주일이 걸립니다.", "등록증이 나오면 남자가 문자로 알려 줍니다."], 4, {
              script: "여자: 외국인 등록증이 언제 나와요?\n남자: 신청하고 3주쯤 걸려요. 나오면 문자로 알려 드릴게요.",
            }),
          ],
        },
        {
          from: 35,
          to: 37,
          instruction: "※ [35~37] 다음을 듣고 물음에 답하십시오.",
          questions: [
            q(35, ["기계를 직접 고칩니다.", "기계를 끕니다.", "집에 갑니다.", "기계를 계속 사용합니다."], 2, {
              prompt: "남자는 먼저 무엇을 해야 합니까?",
              script: "남자: 반장님, 기계에서 이상한 소리가 나요.\n여자: 그래요? 그럼 먼저 기계를 끄고 수리 기사님께 연락하세요. 직접 고치면 절대 안 돼요.",
            }),
            q(36, ["오후 4시", "오후 6시", "오전 11시 30분", "오후 12시 30분"], 1, {
              prompt: "다음 주부터 일은 몇 시에 끝납니까?",
              script: "여자: 다음 주 월요일부터 근무 시간이 바뀝니다. 아침 7시에 시작해서 오후 4시에 끝납니다. 점심시간은 11시 30분부터 12시 30분까지입니다.",
            }),
            q(37, ["여행을 하려고", "병원에 가려고", "친구 결혼식에 가려고", "부모님을 만나려고"], 4, {
              prompt: "여자는 왜 휴가를 갑니까?",
              script: "남자: 수진 씨, 휴가는 언제 가요?\n여자: 다음 달 10일부터 일주일 동안 가요. 고향에 계신 부모님을 만나러 가요.\n남자: 좋겠네요. 잘 다녀오세요.",
            }),
          ],
        },
        {
          from: 38,
          to: 40,
          instruction: "※ [38~40] 다음을 듣고 물음에 답하십시오.",
          script:
            "안내 말씀 드리겠습니다. 오늘 오후 2시부터 3시까지 2층 회의실에서 화학 물질 안전 교육이 있습니다. 모든 작업자는 반드시 참석해야 합니다. 교육 시간에는 보호 장갑과 마스크 사용 방법을 배우고, 화학 물질이 눈이나 피부에 닿았을 때 어떻게 해야 하는지도 배웁니다. 교육에 참석한 사람은 출석표에 이름을 쓰십시오. 감사합니다.",
          questions: [
            q(38, ["회의 시간 변경", "안전 교육", "점심 메뉴", "건강 검진"], 2, { prompt: "무엇에 대한 안내입니까?" }),
            q(39, ["1층 식당", "기숙사", "작업장 앞", "2층 회의실"], 4, { prompt: "교육은 어디에서 합니까?" }),
            q(
              40,
              ["교육은 원하는 사람만 참석합니다.", "교육은 오전에 있습니다.", "교육에 참석하면 출석표에 이름을 씁니다.", "교육에서 기계 사용법을 배웁니다."],
              3,
              { prompt: "들은 내용과 같은 것을 고르십시오." }
            ),
          ],
        },
      ],
    },
  ],
};
