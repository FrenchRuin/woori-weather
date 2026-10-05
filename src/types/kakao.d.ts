// 카카오맵 JavaScript SDK 중 이 앱이 쓰는 부분만 (https://apis.map.kakao.com/web/documentation/)
declare namespace kakao.maps {
  function load(callback: () => void): void;

  class LatLng {
    constructor(lat: number, lng: number);
  }

  class Map {
    constructor(
      container: HTMLElement,
      options: { center: LatLng; level: number },
    );
    panTo(latlng: LatLng): void;
  }

  class CustomOverlay {
    constructor(options: {
      position: LatLng;
      content: HTMLElement;
      map?: Map;
      xAnchor?: number;
      yAnchor?: number;
      zIndex?: number;
      clickable?: boolean;
    });
    setMap(map: Map | null): void;
  }
}

interface Window {
  kakao?: { maps: typeof kakao.maps };
}
