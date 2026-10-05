// 카카오맵 JavaScript SDK 중 이 앱이 쓰는 부분만 (https://apis.map.kakao.com/web/documentation/)
declare namespace kakao.maps {
  function load(callback: () => void): void;

  class LatLng {
    constructor(lat: number, lng: number);
  }

  class LatLngBounds {
    constructor();
    extend(latlng: LatLng): void;
  }

  /** 지도 컨테이너 기준 화면 좌표(px) */
  class Point {
    x: number;
    y: number;
  }

  class MapProjection {
    containerPointFromCoords(latlng: LatLng): Point;
  }

  namespace event {
    function addListener(
      target: Map,
      type: "zoom_changed",
      handler: () => void,
    ): void;
    function removeListener(
      target: Map,
      type: "zoom_changed",
      handler: () => void,
    ): void;
  }

  class Map {
    constructor(
      container: HTMLElement,
      options: { center: LatLng; level: number },
    );
    panTo(latlng: LatLng): void;
    getProjection(): MapProjection;
    setBounds(
      bounds: LatLngBounds,
      paddingTop?: number,
      paddingRight?: number,
      paddingBottom?: number,
      paddingLeft?: number,
    ): void;
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
