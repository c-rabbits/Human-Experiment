# LINE 공식 계정 ID 찾는 방법

앱의 **문의하기** 기능에서 사용하는 **LINE 공식 계정 ID**(`@` 포함 아이디)를 찾는 방법입니다.  
이 ID는 1:1 채팅 링크(`https://line.me/R/ti/p/@공식계정ID`)에 사용됩니다.

---

## 방법 1: LINE 공식계정 관리자센터 (manager.line.biz)

공식 계정을 직접 운영 중이라면, 관리자센터에서 **LINE ID**를 확인·설정할 수 있습니다.

### 1단계: 접속

1. 브라우저에서 **https://manager.line.biz/** 접속
2. **Business ID** 또는 **LINE 계정**으로 로그인

### 2단계: 공식 계정 선택

1. 로그인 후 **사용 중인 공식 계정**을 선택
2. 왼쪽 메뉴에서 **설정** 영역으로 이동

### 3단계: LINE ID 확인

1. **설정** → **계정 설정** (또는 **등록 정보** / **계정 설정 등록 정보**) 메뉴 클릭
2. **비즈니스 프로필** 또는 **계정 정보** 화면에서 다음을 확인합니다.
   - **LINE ID** / **기본 ID** / **공식 계정 ID** 등으로 표시된 항목
   - 형식: `@` + 영문·숫자 (예: `@abc123`)
3. 표시된 값에서 **`@`는 포함해도 되고, 제외해도 됩니다.**  
   - 프로젝트의 `liff-auth.js`에서 `lineOfficialAccountId`에는 **`@` 없이** `abc123`처럼만 넣어도 됩니다.

### 메뉴 이름이 다른 경우

- **설정** 아래에 **프로필**, **계정 정보**, **비즈니스 프로필**, **친구 모으기** 등이 있을 수 있습니다.
- **LINE ID**, **기본 ID**, **공식 계정 아이디**, **Account ID** 같은 문구가 있는 항목을 찾으면 됩니다.
- 화면이 업데이트되어 메뉴 경로가 **설정 → 계정 설정** 또는 **설정 → 등록 정보**로 바뀌었을 수 있으니, 위 키워드로 비슷한 메뉴를 찾아보면 됩니다.

### 참고

- LINE ID는 **한 번 설정하면 변경·삭제가 불가**합니다.
- 아직 LINE ID를 설정하지 않은 공식 계정은, 관리자센터의 계정/프로필 설정에서 **LINE ID 설정** 항목을 통해 처음 한 번 설정할 수 있습니다.

---

## 방법 2: LINE Developers 콘솔 (채널과 연동된 경우)

LIFF·LINE Login·Messaging API용 **채널**을 LINE 공식 계정과 연동해 두었다면, Developers 콘솔에서 **Basic ID**로 같은 값을 확인할 수 있습니다.

### 1단계: 접속

1. **https://developers.line.biz/console/** 접속
2. LINE 계정으로 로그인

### 2단계: 채널 선택

1. 상단에서 **Provider**(제공자) 선택
2. 해당 Provider 아래 **채널** 목록에서  
   - **LINE Login** 채널, **LINE MINI App** 채널, 또는  
   - **Messaging API** 채널  
   중 연동한 공식 계정에 해당하는 채널을 클릭

### 3단계: Basic ID 확인

1. 채널 화면에서 **Basic settings**(기본 설정) 탭 선택
2. **Channel ID**, **Channel secret** 등과 함께 다음 항목을 찾습니다.
   - **Basic ID**  
     - 형식: `@` + 영문·숫자 (예: `@abc123`)
     - 이 값이 1:1 채팅 링크에 쓰는 **공식 계정 ID**와 동일합니다.
3. **Basic ID**가 보이지 않으면:
   - 해당 채널이 **LINE 공식 계정과 연동**되어 있는지 확인하고,
   - **Messaging API** 채널인 경우, 먼저 LINE 공식 계정을 만든 뒤 같은 계정으로 채널을 연동해야 Basic ID가 표시됩니다.

### 주의

- **Channel ID**는 숫자로 된 API용 식별자로, 1:1 채팅 URL에 쓰는 **Basic ID**(`@xxx`)와 다릅니다.
- 문의하기 링크에는 반드시 **Basic ID**(`@` 포함 아이디)를 사용해야 합니다.

---

## 프로젝트에 넣는 방법

1. 위 방법 1 또는 2로 확인한 **공식 계정 ID**를 복사합니다. (예: `@mycompany` 또는 `mycompany`)
2. 프로젝트의 **`js/liff-auth.js`** 파일을 엽니다.
3. `LIFF_CONFIG` 안의 **`lineOfficialAccountId`**에 값을 넣습니다.

```javascript
const LIFF_CONFIG = {
    liffId: '2009089916-d5ymB1Rz',
    lineOfficialAccountId: 'mycompany',   // @ 없이 또는 @ 포함 모두 가능
};
```

4. 저장 후, 앱에서 **문의하기**를 누르면 LINE 공식 계정 1:1 채팅으로 이동합니다.

---

## 요약

| 확인 위치 | 경로 | 표시 이름 예시 |
|----------|------|----------------|
| **공식계정 관리자센터** | https://manager.line.biz/ → 설정 → 계정 설정(등록 정보) / 비즈니스 프로필 | LINE ID, 기본 ID, 공식 계정 ID |
| **LINE Developers 콘솔** | https://developers.line.biz/console/ → Provider → 채널 → Basic settings | Basic ID |

문의하기 링크 형식: `https://line.me/R/ti/p/@공식계정ID`
