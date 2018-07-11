import { Component, ViewChild } from '@angular/core';
import { latLng, tileLayer, DomUtil, Control, Map, LayerOptions } from 'leaflet';
import { LeafletDirective } from '@asymmetrik/ngx-leaflet';
import { Observable } from 'rxjs/internal/Observable';
import { HttpClient, HttpRequest, HttpEventType, HttpResponse } from '@angular/common/http';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  private current_map: Map;

  options = {
    layers: [
      tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw',
        { maxZoom: 18, attribution: '...', id: 'mapbox.streets' })
    ],
    zoom: 13,
    center: latLng(48.792053, 9.187813)
  };

  uploadControl = new Control({
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

  onMapReady(map: Map) {
    this.current_map = map;
    this.current_map.addControl(this.uploadControl);
  }

  onChange(files: FileList) {
    this.postFile(files[0]);
  }
  //

  postFile(fileToUpload: File) {
    const endpoint = 'http://localhost:8000/upload';
    const formData: FormData = new FormData();
    formData.append('fileKey', fileToUpload, fileToUpload.name);
    return this.httpClient
      .post(endpoint, formData).subscribe((response)=>{
        console.info('ok');
      });
  }
}