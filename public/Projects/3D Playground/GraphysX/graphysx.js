import * as THREE from 'three'




export function randomVertexZ(mesh, width, height) {
   
        mesh.geometry.dispose()
        mesh.geometry = new THREE.PlaneGeometry(width, height, width, height ) 
    
        const  posArray = mesh.geometry.attributes.position.array
        for (let i = 0; i < posArray.length; i += 3) {
            const x = posArray[i]
            const y = posArray[i+1]
            const z = posArray[i+2]
    
            //console.log( {x, y, z} )
            //posArray[i] 
            //posArray[i+1]
            posArray[i+2] = z + Math.random()
        }
    }
   
export function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}

/*

cTV_3DVECTOR CLTV3D::getMiddlePoint(cTV_3DVECTOR* v1, cTV_3DVECTOR* v2)
{
    cTV_3DVECTOR pos;
    float fLength = CLTV3D::pTVMaths.TVVec3Distance(v1, v2);
    CLTV3D::pTVMaths.TVVec3Subtract(&pos, v2, v1);
    CLTV3D::pTVMaths.TVVec3MultiplyAdd(&pos, &pos, 0.5f, v1);
    return pos;
}



	void CLTV3D::UpdateMeshToDestination(CTVMesh* Mesh, cTV_3DVECTOR dest, CTVLandscape* Land, float fHeightOffset, float fTimeElapsed)
	{
		cTV_3DVECTOR MeshPosition = Mesh->GetPosition();
		cTV_3DVECTOR MeshDirection;
		float MeshAngleY;

		pTVMaths.TVVec3Subtract(&MeshDirection, &dest, &MeshPosition);
		pTVMaths.TVVec3Normalize(&MeshDirection, &MeshDirection);
		// Update the Mesh's angle
		if (MeshDirection.z > 0)
			MeshAngleY = pTVMaths.Rad2Deg(atan(MeshDirection.x / MeshDirection.z));
		else
			MeshAngleY = pTVMaths.Rad2Deg(atan(MeshDirection.x / MeshDirection.z)) + 180;
		// Set the  mesh rotation
		Mesh->SetRotation(0.0f, MeshAngleY, 0.0f);
		// Check if Mesh has reached destination, if not, update the Mesh
		// position by adding a scale of the vector destination.
		if ((pTVMaths.GetDistance3D(MeshPosition.x, 0, MeshPosition.z, dest.x, 0, dest.z)) > 2)
		{
			// Update all the Mesh's position
			cTV_3DVECTOR dV2;
			pTVMaths.TVVec3Scale(&dV2, &MeshDirection, (fTimeElapsed * 0.1f));
			pTVMaths.TVVec3Add(&MeshPosition, &MeshPosition, &dV2);
			MeshPosition.y = Land->GetHeight(MeshPosition.x, MeshPosition.z) + fHeightOffset;
			// Update the  mesh position
			Mesh->SetPosition(MeshPosition.x, MeshPosition.y, MeshPosition.z);
		}
	};



    
	void CLTV3D::DrawSpline(Spline spline, int RGBAColor){
		cTV_3DVECTOR PrevPoint = spline[0];
		for each(cTV_3DVECTOR vec in spline)
		{
			pTV2DImmediate.Draw_Line3D(PrevPoint.x, PrevPoint.y, PrevPoint.z, vec.x, vec.y, vec.z, RGBAColor);
			PrevPoint = vec;
		}
	}



	void CLTV3D::DrawTV3DAxis(void){
		pTV2DImmediate.Draw_Line3D(0, 0, 0, 10000, 0, 0, RGBA_WHITE, -2);  // X Axis   
		pTV2DImmediate.Draw_Line3D(0, 0, 0, 0, 10000, 0, RGBA_GREEN, -2); // Y Axis   
		pTV2DImmediate.Draw_Line3D(0, 0, 0, 0, 0, 10000, RGBA_RED, -2);  // Z Axis  
	}


	void CLTV3D::ScreenShot(char* filename, cCONST_TV_IMAGEFORMAT format){
		pTV.Screenshot(filename, format);
	}


	int RandomDice(int Size) // Lancer de D�s evenly distributed.
	{
		// srand(UINT(time(NULL)));  // Called once so we can generate random number after...  
		static int const max = RAND_MAX / Size * Size;
		int r = rand();
		while (r >= max) { r = rand(); }
		return r % Size + 1;
	}



    
	GraphysX::Spline CreateTrianglePile(int NbrEtage, cTV_3DVECTOR pos, float BoxSize)
	{
		int iEtage, iLigne;
		GraphysX::Spline TrianglePos;
		cTV_3DVECTOR LineStart;
		//  determin� le nombre de boite dans la pile par Nbr�tage^2 je crois.  et �tablir un vecteur de CTV_3DVECTOR avec ce 
		//  nombre pour contruire la liste finale de position de la boite.
		// int iNbrBox = (NbrEtage*(NbrEtage + 1)) / 2;
		for (iEtage = 0; iEtage < NbrEtage; iEtage++){
			LineStart = cTV_3DVECTOR(pos.x - (BoxSize / 2)*iEtage, pos.y + (NbrEtage - iEtage)*BoxSize, pos.z);
			for (iLigne = 0; iLigne <= iEtage; iLigne++){
				TrianglePos.push_back(cTV_3DVECTOR(LineStart.x + (iLigne)*BoxSize, LineStart.y, LineStart.z));
			}
		}
		return(TrianglePos);
	}


    
	bool IsPositionInsideBoundingBox(cTV_3DVECTOR pos, cTV_3DVECTOR BoxMin, cTV_3DVECTOR BoxMax)
	{
		bool isInside = false;
		if ((pos.x > BoxMin.x) && (pos.x < BoxMax.x)){
			if ((pos.y > BoxMin.y) && (pos.y < BoxMax.y)){
				if ((pos.z > BoxMin.z) && (pos.z < BoxMax.z))
					isInside = true;
			}
		}
		return(isInside);
	}


    









*/