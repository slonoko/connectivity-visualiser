import { Component, ViewChild } from '@angular/core';
import { latLng, tileLayer, DomUtil, Control, Map, LayerOptions, LatLng, Polyline, TileLayer, circle, polygon, LayerGroup } from 'leaflet';
import { LeafletDirective } from '@asymmetrik/ngx-leaflet';
import { Observable } from 'rxjs/internal/Observable';
import { HttpClient, HttpRequest, HttpEventType, HttpResponse } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { empty } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  private current_map: Map;
  private disabledFileUpload: boolean;

  private mapLayer: TileLayer = tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoieGVvbm9zIiwiYSI6ImNqanEzOGMzODV5aWszcG8zZ2NuYWRwY2MifQ.r0EfxOqx3A4CgXOIeKBwuQ',
    { maxZoom: 18, attribution: '...', id: 'mapbox.streets-basic' });

  private networkOverlay: LayerGroup = new LayerGroup();
  private signalOverlay: LayerGroup = new LayerGroup();

  options = {
    layers: [this.mapLayer, this.networkOverlay
    ],
    zoom: 11,
    center: latLng(48.792053, 9.187813)
  };

  layersControl = {
    overlays: {
      'Network type Coverage': this.networkOverlay,
      'Signal strength Coverage': this.signalOverlay

    }
  }

  private uploadControl: Control = new Control({
    position: 'topleft'
  });

  private infoControl: Control = new Control({
    position: 'bottomright'
  });

  constructor(private httpClient: HttpClient) {

  }

  ngOnInit() {
    this.uploadControl.onAdd = (mapbox: Map) => {
      let container: HTMLElement = DomUtil.create('label', 'leaflet-bar leaflet-control leaflet-upload-btn');
      container.setAttribute('for', 'data_upload');
      container.setAttribute('_ngcontent-c0', '');
      return container;
    };

    this.infoControl.onAdd = (map: Map) => {
      let container: HTMLElement = DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-info-panel');
      container.setAttribute('_ngcontent-c0', '');
      container.style.display='none';
      return container;
    };
  }

  onMapReady(map: Map) {
    this.current_map = map;
    this.current_map.addControl(this.uploadControl);
    this.current_map.addControl(this.infoControl);
  }

  onFileSelect(input: HTMLInputElement) {
    const files = input.files;
    if (files && files.length) {

      console.log("Filename: " + files[0].name);
      console.log("Type: " + files[0].type);
      console.log("Size: " + files[0].size + " bytes");

      const fileToRead = files[0];
      let csvContent: any;

      let statistics: any = { 'total': 0, 'net': { 'r': 0, 'y': 0, 'g': 0, 'o': 0 }, 'signal': { 'r': 0, 'y': 0, 'g': 0 } };

      const fileReader = new FileReader();
      fileReader.onload = (fileLoadedEvent: any) => {
        csvContent = fileLoadedEvent.target.result;
        let csvLines = csvContent.split('\n');
        let prevCoords: any = {};
        let prevColor = [];
        let c: number = 0;

        let looper = setInterval(() => {
          if (c == 0) {
            this.uploadControl.getContainer().style.backgroundImage = 'url(/assets/loading.gif)';
            this.uploadControl.getContainer().style.backgroundColor = 'transparent';
            this.disabledFileUpload = true;
          }

          if (c < csvLines.length) {
            for (let i: number = c; i < csvLines.length && i - c < 500; i++) {
              statistics.total += 1;
              let csvLine = csvLines[i];
              let csvTabs = csvLine.split('\t');
              let coords = { 'longitude': csvTabs[1], 'latitude': csvTabs[2] };
              let net_color = 'red';
              let signal_color = 'red';

              if (c == 0) {
                this.current_map.panTo(latLng(csvTabs[2], csvTabs[1]));
                this.current_map.setZoom(11);
              }

              if (csvTabs[4] == '3' || csvTabs[4] == '4') {
                signal_color = 'green';
                statistics.signal.g += 1;
              } else if (csvTabs[4] == '2') {
                signal_color = 'yellow';
                statistics.signal.y += 1;
              } else {
                signal_color = 'red';
                statistics.signal.r += 1;
              }

              if (csvTabs[5] != undefined) {
                net_color = this.cellNetworkColor(csvTabs[5]);
                if (net_color == 'yellow') {
                  statistics.net.y += 1;
                } else if (net_color == 'green') {
                  statistics.net.g += 1;
                } else if (net_color == 'orange') {
                  statistics.net.o += 1;
                } else if (net_color == 'red') {
                  statistics.net.r += 1;
                }
              }

              if (prevCoords.longitude != undefined) {
                if (coords.latitude != undefined && prevCoords.longitude != coords.longitude && prevCoords.latitude != coords.latitude) {
                  let pointA = new LatLng(prevCoords.latitude, prevCoords.longitude);
                  let pointB = new LatLng(coords.latitude, coords.longitude);
                  let pointList = [pointA, pointB];

                  let netPolyline: Polyline = new Polyline(pointList, {
                    color: prevColor[0],
                    weight: 7,
                    opacity: 0.7,
                    smoothFactor: 1,
                    noClip: true
                  });
                  netPolyline.addTo(this.networkOverlay);

                  let signalPolyline: Polyline = new Polyline(pointList, {
                    color: prevColor[1],
                    weight: 7,
                    opacity: 0.7,
                    smoothFactor: 1,
                    noClip: true
                  });
                  signalPolyline.addTo(this.signalOverlay);
                }
              } else {
                this.current_map.options.center = new LatLng(coords.latitude, coords.longitude);
              }
              prevColor = [net_color, signal_color];
              prevCoords = coords;
            }
            c += 501;
          } else {
            this.uploadControl.getContainer().style.backgroundImage = 'url(/assets/upload.png)';
            this.uploadControl.getContainer().style.backgroundColor = 'white';
            this.disabledFileUpload = false;
            this.infoControl.getContainer().style.display='block';
            this.infoControl.getContainer().innerHTML='<table style="width: 100%;padding: 4px;"><tr><td style="font-weight: bold;">Signal Strength</td><td style="font-weight: bold;">Network Type</td></tr><tr><td style="background-color:red;text-align:center;color:white">'+ Math.floor((statistics.signal.r/statistics.total)*100) + '%</td><td style="background-color:red;text-align:center;color:white">'+ Math.floor((statistics.net.r/statistics.total)*100) + '%</td></tr><tr><td style="background-color:yellow;text-align:center;">'+ Math.floor((statistics.signal.y/statistics.total)*100) + '%</td><td style="background-color:yellow;text-align:center;">'+ Math.floor((statistics.net.y/statistics.total)*100) + '%</td></tr><tr><td style="background-color:green;text-align:center;color:white">'+ Math.floor((statistics.signal.g/statistics.total)*100) + '%</td><td style="background-color:orange;text-align:center;color:white">'+ Math.floor((statistics.net.o/statistics.total)*100) + '%</td></tr><tr><td></td><td style="background-color:green;text-align:center;color:white">'+ Math.floor((statistics.net.g/statistics.total)*100) + '%</td></tr></table>';
            clearInterval(looper);
          }
        }, 1);
      };
      fileReader.readAsText(files[0], "UTF-8");
    }
  }

  private cellNetworkColor(network_type: string): string {
    let nt: string = network_type.substring(13, network_type.length);

    if (nt.indexOf('GPRS') > -1 || nt.indexOf('EDGE') > -1 || nt.indexOf('CDMA') > -1 || nt.indexOf('1xRTT') > -1 || nt.indexOf('IDEN') > -1) {
      return 'yellow';
    }

    if (nt.indexOf('UMTS') > -1 || nt.indexOf('EVDO_0') > -1 || nt.indexOf('EVDO_A') > -1 || nt.indexOf('HSDPA') > -1 || nt.indexOf('HSUPA') > -1 || nt.indexOf('HSPA') > -1 || nt.indexOf('EVDO_B') > -1 || nt.indexOf('EHRPD') > -1 || nt.indexOf('HSPAP') > -1) {
      return 'orange';
    }

    if (nt.indexOf('LTE') > -1) {
      return 'green';
    }

    return 'red';
  }
}