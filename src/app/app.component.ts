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

  private mapLayer : TileLayer = tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoieGVvbm9zIiwiYSI6ImNqamwwMzhpeTFhajMzbHNvZ2ZrbXB3Z3gifQ.BcuWxZHulkyQLRZwxe8ooA',
  { maxZoom: 18, attribution: '...', id: 'mapbox.streets-basic' });
 
  private networkOverlay: LayerGroup = new LayerGroup();
  private signalOverlay: LayerGroup = new LayerGroup();

  options = {
    layers: [this.mapLayer,this.networkOverlay
    ],
    zoom: 11,
    center: latLng(48.792053, 9.187813)
  };

  layersControl = {
    overlays: {
      'Network Coverage': this.networkOverlay,
      'Signal Coverage': this.signalOverlay
  
    }
  }

  uploadControl: Control = new Control({
    position: 'topleft'
  });

  constructor(private httpClient: HttpClient) {

  }

  ngOnInit() {
    this.uploadControl.onAdd = (mapbox: Map) => {
      let container: HTMLElement = DomUtil.create('label', 'leaflet-bar leaflet-control');
      container.style.backgroundColor = 'white';
      container.style.width = '30px';
      container.style.height = '30px';
      container.style.backgroundImage = 'url(/assets/upload.png)';
      container.style.backgroundSize = 'cover';
      container.style.backgroundRepeat = 'no-repeat';
      container.style.backgroundPosition = 'center center';
      container.style.cursor = 'pointer';
      container.setAttribute('for', 'data_upload');
      return container;
    };


  }

  onLayerActivated(event:any){
    console.info("test");
  }

  onMapReady(map: Map) {
    this.current_map = map;
    this.current_map.addControl(this.uploadControl);
  }

  /*
    onChange(files: FileList) {
      this.postFile(files[0]);
    }
  
    postFile(fileToUpload: File) {
      const endpoint = 'http://localhost:8000/upload';
      const formData: FormData = new FormData();
      formData.append('fileKey', fileToUpload, fileToUpload.name);
      return this.httpClient
        .post(endpoint, formData).subscribe((response)=>{
          console.info('ok');
        });
    }*/

  onFileSelect(input: HTMLInputElement) {

    const files = input.files;

    if (files && files.length) {

      console.log("Filename: " + files[0].name);
      console.log("Type: " + files[0].type);
      console.log("Size: " + files[0].size + " bytes");

      const fileToRead = files[0];
      let csvContent: any;

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
              let csvLine = csvLines[i];
              let csvTabs = csvLine.split('\t');
              let coords = { 'longitude': csvTabs[1], 'latitude': csvTabs[2] };
              let net_color = 'red';
              let signal_color = 'red';

              if(c==0){
                this.current_map.panTo(latLng(csvTabs[2], csvTabs[1]));
                this.current_map.setZoom(11);
              }

              if (csvTabs[4] == '3' || csvTabs[4] == '4') {
                signal_color = 'green';
              } else if (csvTabs[4] == '2') {
                signal_color = 'yellow';
              }

              if (csvTabs[5] != undefined)
              net_color = this.cellNetworkColor(csvTabs[5]);

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