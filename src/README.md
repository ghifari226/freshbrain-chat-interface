# Arsitektur frontend

`app` menyusun provider, layout, dan route. `features` memiliki perilaku produk. `integrations` membungkus sistem eksternal. `shared` hanya berisi implementasi yang dipakai beberapa fitur yang tidak saling terkait. `core` berisi primitive aplikasi yang dependency-light seperti konfigurasi runtime dan tipe dasar.

Alur dependensi yang diperbolehkan:

```text
app -> features -> integrations
        |              |
        v              v
      shared -------> core
```

- Import lintas fitur harus melewati `index.js` atau entry point eksplisit di root fitur tujuan.
- Import internal dalam satu fitur menggunakan path relatif.
- `core`, `shared`, dan `integrations` tidak boleh bergantung pada `features` atau `app`.
- Folder `api`, `components`, `model`, dan `pages` dibuat hanya saat tanggung jawab tersebut benar-benar ada.
